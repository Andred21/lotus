#!/usr/bin/env bash
#
# Detecção do gatilho de reversão do ADR-09 (revisão 2026-09).
#
# O RDS foi descartado pelo teto de custo, e o preço disso foi "backup provado".
# A própria revisão do ADR escreveu o gatilho de volta: se o backup ficar mais de
# 7 dias sem sucesso, volta-se ao RDS. Só que NINGUÉM saberia que passaram 7
# dias — o cron do backup-db.sh manda o resultado para /var/log/lotus-backup.log,
# que nada lê, e o host não tem MTA. Gatilho sem detecção é gatilho decorativo
# (Q-4 do review de 2026-09-20).
#
# Este script é a detecção, e ele olha o EFEITO, não o processo: a idade do
# objeto mais recente em s3://$BUCKET/backups/. Por isso ele avisa mesmo quando
# o backup-db.sh morre antes de imprimir qualquer coisa, quando o cron some, ou
# quando a instância é recriada sem o crontab.
#
# O limite dele é 2 dias, e não 7, de propósito: uma noite falhada é soluço,
# duas é padrão. O alerta chega com 5 dias de folga para o gatilho do ADR ser
# uma DECISÃO e não uma descoberta.
#
# Canal: o mesmo tópico SNS do billing alarm (runbook §10), que já existe e já
# tem a subscription do João confirmada. Não é o bloco de observabilidade — é a
# linha que faltava para o gatilho existir.
set -euo pipefail
umask 077

# Mesmo gancho do LOTUS_ENV_FILE do compose de producao: o default aponta para
# o caminho de producao, e a prova local sobrescreve a variavel. E o que permite
# este script ser EXECUTADO numa sonda, e nao so conferido por texto.
BASE="${LOTUS_BASE:-/opt/lotus}"
LIMITE_DIAS="${LOTUS_BACKUP_MAX_DIAS:-2}"

# Só as chaves que este script consome — sem `source` do .env inteiro. O
# `|| true` não é decoração: com `set -euo pipefail`, grep sem match sai 1,
# pipefail propaga e o script morreria AQUI, antes da guarda que explica o quê.
chave() { grep -E "^$1=" "$BASE/.env" | cut -d= -f2- || true; }

BUCKET=$(chave LOTUS_BACKUP_BUCKET)
[ -n "$BUCKET" ] || { echo "erro: LOTUS_BACKUP_BUCKET ausente do .env" >&2; exit 1; }

# Sem canal esta verificação não avisa ninguém, e uma verificação que não avisa é
# exatamente o problema que ela veio resolver. Então ela recusa rodar.
TOPICO=$(chave LOTUS_ALERT_TOPIC_ARN)
[ -n "$TOPICO" ] || { echo "erro: LOTUS_ALERT_TOPIC_ARN ausente do .env — sem canal nao ha aviso" >&2; exit 1; }

# A região sai do PRÓPRIO ARN (campo 4). O tópico do billing alarm vive em
# us-east-1 — a métrica EstimatedCharges só existe lá — e a EC2 em sa-east-1;
# sem isto o publish iria para a região da instância e falharia com
# NotFound num tópico que existe.
REGIAO=$(printf '%s' "$TOPICO" | cut -d: -f4)

gritar() {
  echo "$1" >&2
  aws sns publish --region "$REGIAO" --topic-arn "$TOPICO" \
    --subject 'Lotus: backup do banco de producao' --message "$1" --output text >/dev/null \
    || echo "erro: o alerta NAO saiu (aws sns publish falhou)" >&2
  exit 1
}

QUANDO=$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix backups/ \
  --query 'sort_by(Contents,&LastModified)[-1].LastModified' --output text 2>/dev/null || echo None)

[ -n "$QUANDO" ] && [ "$QUANDO" != "None" ] \
  || gritar "Lotus: nenhum backup em s3://$BUCKET/backups/. O banco de producao esta sem copia. ADR-09: gatilho de reversao ao RDS."

IDADE=$(( ( $(date -u +%s) - $(date -u -d "$QUANDO" +%s) ) / 86400 ))
[ "$IDADE" -le "$LIMITE_DIAS" ] \
  || gritar "Lotus: o backup mais recente de s3://$BUCKET/backups/ tem ${IDADE} dias (limite ${LIMITE_DIAS}). Ultimo: $QUANDO. Aos 7 dias o gatilho de reversao do ADR-09 dispara."

echo "backup ok: o mais recente tem ${IDADE}d (limite ${LIMITE_DIAS}d) — $QUANDO"
