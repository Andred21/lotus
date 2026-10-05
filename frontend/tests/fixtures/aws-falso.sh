#!/usr/bin/env bash
#
# `aws` de mentira do frontend/tests/criar-observabilidade.test.ts. Registra
# cada chamada em $FAKE_LOG — uma linha `---` e depois um argumento por linha —
# e devolve o minimo que o deploy/aws/criar-observabilidade.sh le. Os FAKE_*
# escolhem o cenario; sem eles, tudo existe e tudo passa.
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
        case "$linha" in *'"up":'*) echo 1 ;; *) echo 0 ;; esac
        ;;
      *'$.cert_dias'*)
        case "$linha" in *'"cert_dias":'*) echo 1 ;; *) echo 0 ;; esac
        ;;
      *'$.log'*)
        case "$padrao" in
          *%*) recusa=${FAKE_RECUSA_REGEX:-0} ;;
          *) recusa=${FAKE_RECUSA_LITERAL:-0} ;;
        esac
        if [ "$recusa" = 1 ]; then
          echo 'An error occurred (InvalidParameterException): Invalid character(s) in term' >&2
          exit 254
        fi
        case "$linha" in *' 502 '* | *' 503 '*) echo 1 ;; *) echo 0 ;; esac
        ;;
    esac
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
    echo 4
    ;;
esac
exit 0
