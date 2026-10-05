#!/usr/bin/env bash
#
# `aws` de mentira do frontend/tests/criar-observabilidade.test.ts. Registra
# cada chamada em $FAKE_LOG - uma linha `---` e depois um argumento por linha -
# e devolve o minimo que o deploy/aws/criar-observabilidade.sh le. Os FAKE_*
# escolhem o cenario; sem eles, tudo existe e tudo passa, exceto o readback da
# retencao, que responde vazio: o teste informa a retencao por FAKE_RETENCAO,
# porque prod e lab pedem valores diferentes.
{
  printf '%s\n' '---'
  printf '%s\n' "$@"
} >> "$FAKE_LOG"

junto=" $* "
case "$junto" in
  *" sts get-caller-identity "*)
    echo 123456789012
    ;;
  *" logs test-metric-filter "*)
    padrao='' linha='' anterior=''
    for arg in "$@"; do
      case "$anterior" in
        --filter-pattern) padrao=$arg ;;
        --log-event-messages) linha=$arg ;;
      esac
      anterior=$arg
    done
    case "$padrao" in
      *'$.up'*)
        qual_padrao=up
        case "$linha" in *'"up":'*) casou=1 ;; *) casou=0 ;; esac
        ;;
      *'$.cert_dias'*)
        qual_padrao=cert
        case "$linha" in *'"cert_dias":'*) casou=1 ;; *) casou=0 ;; esac
        ;;
      *'$.log'*)
        case "$padrao" in
          *%*) qual_padrao=regex recusa=${FAKE_RECUSA_REGEX:-0} ;;
          *) qual_padrao=literal recusa=${FAKE_RECUSA_LITERAL:-0} ;;
        esac
        if [ "$recusa" = 1 ]; then
          echo 'An error occurred (InvalidParameterException): Invalid character(s) in term' >&2
          exit 254
        fi
        case "$linha" in *' 502 '* | *' 503 '*) casou=1 ;; *) casou=0 ;; esac
        ;;
    esac
    # FAKE_INVERTE=<padrao>:<linha> vira a resposta de UMA comparacao do script.
    # Cada comparacao tem o seu cenario: inverter todas provaria so o `|| falha`
    # (revisao do item 34, rodada 2, Q-1).
    case "$linha" in
      *'"cert_dias":84'*) qual_linha=sonda-ok ;;
      *'"cert_dias":-2'*) qual_linha=sonda-vencido ;;
      *'"up":0'*) qual_linha=sonda-fora ;;
      *'HTTP/2.0'*' 200 '*) qual_linha=200-h2 ;;
      *'HTTP/2.0'*' 503 '*) qual_linha=503-h2 ;;
      *' 200 '*) qual_linha=200-h1 ;;
      *' 502 '*) qual_linha=502-h1 ;;
      *) qual_linha=lixo ;;
    esac
    if [ "${FAKE_INVERTE:-}" = "$qual_padrao:$qual_linha" ]; then casou=$((1 - casou)); fi
    echo "$casou"
    ;;
  *" logs describe-log-groups "*retentionInDays*)
    echo "${FAKE_RETENCAO:-}"
    ;;
  *" cloudwatch get-metric-statistics "*"--metric-name Up "*)
    echo "${FAKE_UP:-5}"
    ;;
  *" cloudwatch get-metric-statistics "*"--metric-name disk_used_percent "*)
    echo "${FAKE_DISCO:-5}"
    ;;
  *" sns list-subscriptions-by-topic "*)
    echo "${FAKE_ASSINATURAS:-1}"
    ;;
  *" cloudwatch describe-alarms "*"length(MetricAlarms"*)
    echo "${FAKE_ACOES:-4}"
    ;;
esac
exit 0
