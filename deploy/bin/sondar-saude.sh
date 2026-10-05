#!/usr/bin/env bash
#
# Sonda de saude da producao (item 34, spec sec. 4.2). O timer lotus-sonda, que o
# user-data instala, roda este script a cada minuto, como root. Cada execucao
# grava UMA linha JSON no sonda.log:
#
#   {"ts":"2026-10-04T21:00:00Z","up":1,"http":200,"cert_dias":84}
#
# O CloudWatch agent leva a linha ao grupo /lotus/<ambiente>/sonda, e os metric
# filters do deploy/aws/criar-observabilidade.sh fazem dela Lotus/Sonda Up e
# CertDias. A medicao E a linha: o script sai 0 sempre que a grava, qualquer que
# seja o resultado, e so sai diferente de 0 quando nao consegue grava-la.
# Sem credencial AWS e sem ler o .env.
set -euo pipefail

NOME=app.lotusotec.cl
URL="${LOTUS_SONDA_URL:-https://$NOME/up}"
# >>> VARIANTE A (HAIRPIN: ok) - troque este bloco pela VARIANTE B se a Task 1 mandar.
# Caminho ate o nginx: o hairpin pelo EIP, medido na Task 1 do plano do item 34
# (audit do bloco). Passa por DNS, EIP, security group e TLS como um cliente,
# so que de dentro da AWS.
TLS="${LOTUS_SONDA_TLS:-$NOME:443}"
RESOLVER=()
# <<< VARIANTE A
# Com um PEM aqui, os dias saem do arquivo, sem conectar: e assim que o teste e
# a janela de sondas (runbook sec. 14.4) provam o alarme sem tocar no certificado
# servido.
CERT_ARQUIVO="${LOTUS_SONDA_CERT_ARQUIVO:-}"
LOG="${LOTUS_SONDA_LOG:-/var/log/lotus/sonda.log}"

# HTTP. Sem -L: o 301 da porta 80 nao e saude. Teto de 10 s, para uma execucao
# nunca encostar na seguinte. Sem resposta, o curl escreve 000.
HTTP=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${RESOLVER[@]}" "$URL" || true)
[[ $HTTP =~ ^[0-9]{3}$ ]] || HTTP=000
HTTP=$((10#$HTTP))
UP=0
if [ "$HTTP" -eq 200 ]; then UP=1; fi

if [ -n "$CERT_ARQUIVO" ]; then
  PEM=$(cat "$CERT_ARQUIVO" 2>/dev/null || true)
else
  PEM=$(timeout 10 openssl s_client -connect "$TLS" -servername "$NOME" </dev/null 2>/dev/null || true)
fi
FIM=$(printf '%s\n' "$PEM" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)

# Medicao que falhou omite a chave, nunca grava numero: um 0 inventado viraria
# "certificado vencido" no alarme. Piso, nao truncamento: vencido ha 2 h da -1.
CERT=''
if [ -n "$FIM" ] && VENCE=$(date -u -d "$FIM" +%s 2>/dev/null); then
  RESTO=$((VENCE - $(date -u +%s)))
  if [ "$RESTO" -ge 0 ]; then
    DIAS=$((RESTO / 86400))
  else
    DIAS=$((-((-RESTO + 86399) / 86400)))
  fi
  CERT=",\"cert_dias\":$DIAS"
fi

printf '{"ts":"%s","up":%d,"http":%d%s}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$UP" "$HTTP" "$CERT" >> "$LOG"
