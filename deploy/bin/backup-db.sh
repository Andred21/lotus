#!/usr/bin/env bash
#
# Backup do MySQL de produção para o S3 (spec v2 do item 10, §8) — a
# mitigação escrita na revisão 2026-09 do ADR-09. Roda pelo CRON DO HOST
# (o scheduler vive dentro do container e não alcança `docker exec`).
# Retenção: lifecycle rule do bucket expira backups/ em 30 dias (runbook §3).
set -euo pipefail
# O dump passa pelo /tmp do host, que é 1777, e o umask default do root é 022 —
# os dois arquivos nasciam 0644, legíveis por qualquer usuário local. Não é
# dado qualquer: são as tabelas `certificates` e `audits` inteiras, o material
# de peso legal do produto, e o host tem o usuário `ubuntu` além do root. A
# janela é curta porque o `trap ... EXIT` apaga no fim, mas o trap cobre
# REMOÇÃO, não permissão (Q-8 do review de 2026-09-20).
umask 077

BASE=/opt/lotus
# Só a chave que este script consome — sem `source` do .env inteiro.
# O `|| true` não é ruído: com `set -euo pipefail`, grep sem match sai 1,
# `pipefail` propaga pelo `cut` e a ATRIBUIÇÃO sai 1 — `set -e` matava o script
# aqui, uma linha antes da guarda, e a mensagem abaixo nunca imprimia. A guarda
# existe justamente para quem edita o `.env` do host e derruba a chave, que é o
# caso em que o script morria mudo (Q-5 do review de 2026-09-20).
BUCKET=$(grep -E '^LOTUS_BACKUP_BUCKET=' "$BASE/.env" | cut -d= -f2- || true)
[ -n "$BUCKET" ] || { echo "erro: LOTUS_BACKUP_BUCKET ausente do .env" >&2; exit 1; }

MYSQL=$(docker compose -p lotus --project-directory "$BASE" -f "$BASE/docker-compose.prod.yml" ps -q mysql)
[ -n "$MYSQL" ] || { echo "erro: serviço mysql não está de pé" >&2; exit 1; }

ARQ="lotus-$(date -u +%Y-%m-%dT%H-%M).sql.gz"
BRUTO="/tmp/${ARQ%.gz}"
# Dump de produção não fica no /tmp do host nem quando o script morre no meio.
trap 'rm -f "$BRUTO" "/tmp/$ARQ"' EXIT

# --single-transaction: dump consistente sem travar o InnoDB. A senha vem do
# ambiente do PRÓPRIO container — não passa pela linha de comando do host.
docker exec "$MYSQL" sh -c 'exec mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  > "$BRUTO"

# As duas guardas medem o dump BRUTO. Medir o gzip aqui foi o erro que recusou o
# primeiro backup real (2026-09-17): schema + seed mínimo dão 62 KiB crus e 8,9 KiB
# comprimidos, e o piso de 10 KiB foi escrito para o tamanho cru.
[ "$(stat -c %s "$BRUTO")" -gt 10240 ] || { echo "erro: dump suspeito de vazio ($(stat -c %s "$BRUTO") bytes)" >&2; exit 1; }
# Rodapé do mysqldump: só existe se o dump chegou ao fim. Pipe que morre no meio
# deixa um arquivo grande e inútil, e tamanho sozinho não distingue os dois.
tail -1 "$BRUTO" | grep -q '^-- Dump completed' || { echo "erro: dump truncado (sem o rodape do mysqldump)" >&2; exit 1; }

gzip -c "$BRUTO" > "/tmp/$ARQ"
aws s3 cp "/tmp/$ARQ" "s3://$BUCKET/backups/$ARQ" --only-show-errors
echo "backup ok: s3://$BUCKET/backups/$ARQ"
