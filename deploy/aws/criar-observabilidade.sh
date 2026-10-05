#!/usr/bin/env bash
#
# Observabilidade da producao (item 34; spec do bloco, sec. 4.3; runbook sec. 14).
# Idempotente: reexecutar nao estraga nada, e cada etapa termina em readback.
# Quem roda e' o JOAO, com credencial administrativa da conta; a sessao confere
# a saida.
#
# Uso, da raiz do repositorio:
#   deploy/aws/criar-observabilidade.sh base prod   # inline, grupos de 30 dias, os tres filtros
#   deploy/aws/criar-observabilidade.sh base lab    # grupos de 1 dia, sem filtro
#   deploy/aws/criar-observabilidade.sh alarmes     # os quatro alarmes de producao
#
# Nenhum numero de conta nem ARN neste arquivo: a conta vem do sts, e o ARN do
# topico se monta com ela.
set -euo pipefail

REGIAO="${LOTUS_REGIAO:-sa-east-1}"

# Dimensoes EXATAS do disk_used_percent de producao: as que o agente publica com
# drop_device e omit_hostname (user-data). O fstype e' o de / no host, lido na
# Task 1 do plano do item 34 e conferido no lab. O alarme e a recusa do
# `alarmes` usam as mesmas.
DISCO=(Name=Ambiente,Value=prod Name=fstype,Value=ext4 Name=path,Value=/)
ALARMES=(lotus-prod-up lotus-prod-5xx lotus-prod-disco lotus-prod-certificado)

# Linhas de prova do test-metric-filter. As do nginx sao linhas reais do
# json-file de producao (audit do item 34, Task 1), com o IP do hairpin trocado
# por 203.0.113.10; a de 5xx e' a de 200 com outro status, para o padrao provar
# que olha o status e nao o resto da linha.
NGINX_200='{"log":"127.0.0.1 - - [05/Oct/2026:01:43:14 +0000] \"GET /up HTTP/1.1\" 200 1832 \"-\" \"Wget\" \"-\"\n","stream":"stdout","time":"2026-10-05T01:43:14.276825915Z"}'
NGINX_502='{"log":"127.0.0.1 - - [05/Oct/2026:01:43:14 +0000] \"GET /up HTTP/1.1\" 502 1832 \"-\" \"Wget\" \"-\"\n","stream":"stdout","time":"2026-10-05T01:43:14.276825915Z"}'
NGINX_H2_200='{"log":"203.0.113.10 - - [05/Oct/2026:01:43:27 +0000] \"GET /up HTTP/2.0\" 200 1825 \"-\" \"curl/8.5.0\" \"-\"\n","stream":"stdout","time":"2026-10-05T01:43:27.945738889Z"}'
NGINX_H2_503='{"log":"203.0.113.10 - - [05/Oct/2026:01:43:27 +0000] \"GET /up HTTP/2.0\" 503 1825 \"-\" \"curl/8.5.0\" \"-\"\n","stream":"stdout","time":"2026-10-05T01:43:27.945738889Z"}'
SONDA_OK='{"ts":"2026-10-04T21:00:00Z","up":1,"http":200,"cert_dias":84}'
SONDA_FORA='{"ts":"2026-10-04T21:00:00Z","up":0,"http":0}'
SONDA_VENCIDO='{"ts":"2026-10-04T21:00:00Z","up":1,"http":200,"cert_dias":-2}'
LIXO='linha que nao e da sonda'

# Padroes (spec sec. 4.3). Up e CertDias casam so a linha que traz a chave e
# ficam sem default: um 0 em cada evento que nao casa viraria queda falsa e
# certificado vencido falso. O 5xx tem duas formas, nesta ordem: a regex, com
# `.` no lugar da aspa e do espaco, que o CloudWatch recusa em regex (medido em
# 2026-10-04: "Invalid character(s) in term"), e o termo literal. Vale a
# primeira que o test-metric-filter aceitar e que se comportar.
P_UP='{ ($.up = 0) || ($.up = 1) }'
P_CERT='{ ($.cert_dias > 0) || ($.cert_dias <= 0) }'
P_5XX_REGEX='{ $.log = %HTTP/[0-9.]+..5[0-9]{2}.% }'
P_5XX_LITERAL='{ ($.log = "*HTTP/1.1\" 5*") || ($.log = "*HTTP/2.0\" 5*") || ($.log = "*HTTP/1.0\" 5*") }'

uso() {
  echo "uso: $0 base <prod|lab>  |  $0 alarmes" >&2
  exit 2
}

falha() {
  echo "erro: $*" >&2
  exit 1
}

# confere <padrao> <esperado: 0 ou 1> <linha>: o test-metric-filter da AWS casa
# (1) ou nao (0) a linha. Padrao recusado pela API conta como nao conferido.
confere() {
  local obtido
  if ! obtido=$(aws logs test-metric-filter --region "$REGIAO" --filter-pattern "$1" \
      --log-event-messages "$3" --query 'length(matches)' --output text 2>"$TMP/erro"); then
    echo "    recusado pela API: $(head -c 300 "$TMP/erro")" >&2
    return 1
  fi
  echo "    test-metric-filter: esperado $2, obtido $obtido"
  [ "$obtido" = "$2" ]
}

# filtro <grupo> <metrica> <valor> <default, ou - sem default> <padrao>. O nome
# do filtro e' o da metrica; namespace Lotus/Sonda, sem dimensao (achado 2).
filtro() {
  local transformacao="metricName=$2,metricNamespace=Lotus/Sonda,metricValue=$3"
  [ "$4" = - ] || transformacao="$transformacao,defaultValue=$4"
  aws logs put-metric-filter --region "$REGIAO" --log-group-name "$1" \
    --filter-name "$2" --filter-pattern "$5" --metric-transformations "$transformacao"
  echo "==> filtro $2 em $1"
}

# alarme <nome> <namespace> <metrica> <estatistica> <periodo> <N> <M>
#        <operador> <limiar> <falta de dado> <descricao> [dimensao...]
# Avisa o topico no ALARM e no OK (D5).
alarme() {
  local nome=$1 namespace=$2 metrica=$3 estatistica=$4 periodo=$5 n=$6 m=$7
  local operador=$8 limiar=$9 falta=${10} descricao=${11}
  shift 11
  local dimensoes=()
  [ $# -eq 0 ] || dimensoes=(--dimensions "$@")
  aws cloudwatch put-metric-alarm --region "$REGIAO" --alarm-name "$nome" \
    --alarm-description "$descricao" \
    --namespace "$namespace" --metric-name "$metrica" "${dimensoes[@]}" \
    --statistic "$estatistica" --period "$periodo" \
    --evaluation-periods "$n" --datapoints-to-alarm "$m" \
    --comparison-operator "$operador" --threshold "$limiar" \
    --treat-missing-data "$falta" \
    --alarm-actions "$TOPICO" --ok-actions "$TOPICO"
  echo "==> alarme $nome"
}

base() {
  local ambiente=$1 retencao grupo candidato p5xx=''
  if [ "$ambiente" = prod ]; then retencao=30; else retencao=1; fi

  # A mesma inline nos dois ambientes: o lab assume a lotus-ec2, como um
  # recreate real. So escreve log em grupo /lotus/* e so publica metrica em
  # Lotus/Host. Sem logs:CreateLogGroup e sem logs:PutRetentionPolicy: do host
  # nao se cria grupo nem se muda retencao - as duas coisas sao desta etapa,
  # com a credencial do Joao. PutMetricData nao aceita recurso; a condicao no
  # namespace e' o que o estreita.
  cat > "$TMP/observabilidade.json" <<JSON
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow",
  "Action":["logs:CreateLogStream","logs:PutLogEvents","logs:DescribeLogStreams"],
  "Resource":[
   "arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*",
   "arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*:log-stream:*"]},
 {"Effect":"Allow","Action":"cloudwatch:PutMetricData","Resource":"*",
  "Condition":{"StringEquals":{"cloudwatch:namespace":"Lotus/Host"}}}]}
JSON
  aws iam put-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade \
    --policy-document "file://$TMP/observabilidade.json"
  echo "==> inline lotus-observabilidade na lotus-ec2"

  for grupo in "/lotus/$ambiente/containers" "/lotus/$ambiente/sonda"; do
    if [ -z "$(aws logs describe-log-groups --region "$REGIAO" --log-group-name-prefix "$grupo" \
        --query "logGroups[?logGroupName=='$grupo'].logGroupName" --output text)" ]; then
      aws logs create-log-group --region "$REGIAO" --log-group-name "$grupo"
      echo "==> grupo $grupo criado"
    fi
    aws logs put-retention-policy --region "$REGIAO" --log-group-name "$grupo" \
      --retention-in-days "$retencao"
  done

  # Todo padrao passa pelo test-metric-filter ANTES de qualquer put-metric-filter,
  # nos dois ambientes: no lab, e' a validacao sem publicar.
  echo "==> conferindo os padroes"
  { confere "$P_UP" 1 "$SONDA_OK" && confere "$P_UP" 1 "$SONDA_FORA" \
    && confere "$P_UP" 0 "$LIXO"; } || falha "o padrao de Up nao se comportou como o esperado"
  { confere "$P_CERT" 1 "$SONDA_OK" && confere "$P_CERT" 1 "$SONDA_VENCIDO" \
    && confere "$P_CERT" 0 "$SONDA_FORA"; } || falha "o padrao de CertDias nao se comportou como o esperado"
  for candidato in "$P_5XX_REGEX" "$P_5XX_LITERAL"; do
    echo "    5xx: $candidato"
    if confere "$candidato" 1 "$NGINX_502" && confere "$candidato" 1 "$NGINX_H2_503" \
        && confere "$candidato" 0 "$NGINX_200" && confere "$candidato" 0 "$NGINX_H2_200"; then
      p5xx=$candidato
      break
    fi
  done
  [ -n "$p5xx" ] || falha "PORTAO D14: o test-metric-filter recusou as duas formas do 5xx; o bloco volta ao Joao (spec sec. 6)"
  echo "==> 5xx com: $p5xx"

  # Filtros so em prod (achado 2 da spec): metric filter nao aceita dimensao
  # fixa, e um filtro igual no lab publicaria na metrica dos alarmes de producao.
  if [ "$ambiente" = prod ]; then
    filtro /lotus/prod/sonda Up '$.up' - "$P_UP"
    filtro /lotus/prod/sonda CertDias '$.cert_dias' - "$P_CERT"
    filtro /lotus/prod/containers Http5xx 1 0 "$p5xx"
  fi

  echo
  echo "===== readback ====="
  aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade \
    --query PolicyDocument --output json
  for grupo in "/lotus/$ambiente/containers" "/lotus/$ambiente/sonda"; do
    [ "$(aws logs describe-log-groups --region "$REGIAO" --log-group-name-prefix "$grupo" \
        --query "logGroups[?logGroupName=='$grupo'].retentionInDays" --output text)" = "$retencao" ] \
      || falha "$grupo sem a retencao de $retencao dia(s)"
    echo "$grupo: $retencao dia(s)"
    aws logs describe-metric-filters --region "$REGIAO" --log-group-name "$grupo" \
      --query 'metricFilters[].[filterName,filterPattern,to_string(metricTransformations)]' --output text
  done
}

alarmes() {
  local inicio fim pontos confirmadas
  inicio=$(date -u -d '-10 minutes' +%Y-%m-%dT%H:%M:%SZ)
  fim=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Tres recusas, cada uma olhando o efeito (spec sec. 4.3).
  # 1. Sem ponto de Up nos ultimos 10 min, o alarme de /up nasceria disparando
  #    por falta de dado.
  pontos=$(aws cloudwatch get-metric-statistics --region "$REGIAO" --namespace Lotus/Sonda \
    --metric-name Up --start-time "$inicio" --end-time "$fim" --period 60 --statistics SampleCount \
    --query 'length(Datapoints)' --output text)
  [ "$pontos" -gt 0 ] 2>/dev/null \
    || falha "sem Lotus/Sonda Up nos ultimos 10 min: instale a sonda e o agente (runbook sec. 14.2) antes"
  # 2. Sem a metrica de disco com as dimensoes EXATAS do alarme, ele nunca
  #    sairia de INSUFFICIENT_DATA. get-metric-statistics so devolve ponto para
  #    o conjunto exato de dimensoes.
  pontos=$(aws cloudwatch get-metric-statistics --region "$REGIAO" --namespace Lotus/Host \
    --metric-name disk_used_percent --dimensions "${DISCO[@]}" \
    --start-time "$inicio" --end-time "$fim" --period 60 --statistics Maximum \
    --query 'length(Datapoints)' --output text)
  [ "$pontos" -gt 0 ] 2>/dev/null \
    || falha "sem Lotus/Host disk_used_percent com ${DISCO[*]}: compare com o list-metrics (runbook sec. 14.5)"
  # 3. Sem assinatura confirmada, os alarmes avisariam ninguem.
  #    PendingConfirmation nao e' ARN e nao conta.
  confirmadas=$(aws sns list-subscriptions-by-topic --region "$REGIAO" --topic-arn "$TOPICO" \
    --query "length(Subscriptions[?starts_with(SubscriptionArn, 'arn:')])" --output text)
  [ "$confirmadas" -gt 0 ] 2>/dev/null \
    || falha "lotus-alertas sem assinatura confirmada (runbook sec. 14.8)"

  #      nome                   namespace   metrica           estat.  per. N M operador                      limiar falta        descricao
  alarme lotus-prod-up          Lotus/Sonda Up                Minimum 60   5 3 LessThanThreshold             1      breaching    "Lotus producao: a sonda de /up sem 200 ou sem dado (app, nginx, agente, sonda ou host). Runbook deploy/aws/README.md secao 14.6"
  alarme lotus-prod-5xx         Lotus/Sonda Http5xx           Sum     300  1 1 GreaterThanOrEqualToThreshold 5      notBreaching "Lotus producao: 5 ou mais respostas 5xx do nginx em 5 minutos. Runbook deploy/aws/README.md secao 14.6"
  alarme lotus-prod-disco       Lotus/Host  disk_used_percent Maximum 300  2 2 GreaterThanThreshold          80     ignore       "Lotus producao: disco / acima de 80% em 10 minutos. Runbook deploy/aws/README.md secao 14.6" "${DISCO[@]}"
  alarme lotus-prod-certificado Lotus/Sonda CertDias          Minimum 300  1 1 LessThanThreshold             21     ignore       "Lotus producao: o certificado servido na 443 vence em menos de 21 dias. Runbook deploy/aws/README.md secao 14.6"

  echo
  echo "===== readback ====="
  aws cloudwatch describe-alarms --region "$REGIAO" --alarm-names "${ALARMES[@]}" \
    --query 'MetricAlarms[].[AlarmName,Namespace,MetricName,to_string(Dimensions),Statistic,Period,ComparisonOperator,Threshold,EvaluationPeriods,DatapointsToAlarm,TreatMissingData,length(AlarmActions),length(OKActions),StateValue]' \
    --output text
  [ "$(aws cloudwatch describe-alarms --region "$REGIAO" --alarm-names "${ALARMES[@]}" \
      --query 'length(MetricAlarms[?length(AlarmActions) > `0` && length(OKActions) > `0`])' \
      --output text)" = 4 ] || falha "o readback nao mostra os quatro alarmes com acao de ALARM e de OK"
}

case "${1:-}" in
  base) { [ $# -eq 2 ] && { [ "$2" = prod ] || [ "$2" = lab ]; }; } || uso ;;
  alarmes) [ $# -eq 1 ] || uso ;;
  *) uso ;;
esac

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CONTA=$(aws sts get-caller-identity --query Account --output text)
TOPICO="arn:aws:sns:$REGIAO:$CONTA:lotus-alertas"
echo "==> regiao $REGIAO, etapa $*"

if [ "$1" = base ]; then base "$2"; else alarmes; fi
