#!/usr/bin/env bash
#
# Backup do MySQL de produção para o S3 (spec v2 do item 10, §8) — a
# mitigação escrita na revisão 2026-09 do ADR-09. Roda pelo CRON DO HOST
# (o scheduler vive dentro do container e não alcança `docker exec`).
# Retenção: lifecycle rule do bucket expira backups/ em 30 dias (runbook §3).
set -euo pipefail

BASE=/opt/lotus
# Só a chave que este script consome — sem `source` do .env inteiro.
BUCKET=$(grep -E '^LOTUS_BACKUP_BUCKET=' "$BASE/.env" | cut -d= -f2-)
[ -n "$BUCKET" ] || { echo "erro: LOTUS_BACKUP_BUCKET ausente do .env" >&2; exit 1; }

MYSQL=$(docker compose -p lotus --project-directory "$BASE" -f "$BASE/docker-compose.prod.yml" ps -q mysql)
[ -n "$MYSQL" ] || { echo "erro: serviço mysql não está de pé" >&2; exit 1; }

ARQ="lotus-$(date -u +%Y-%m-%dT%H-%M).sql.gz"
# --single-transaction: dump consistente sem travar o InnoDB. A senha vem do
# ambiente do PRÓPRIO container — não passa pela linha de comando do host.
docker exec "$MYSQL" sh -c 'exec mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "/tmp/$ARQ"

# Dump vazio é falha, não backup: schema + seed mínimo já passam de 10 KiB.
[ "$(stat -c %s "/tmp/$ARQ")" -gt 10240 ] || { echo "erro: dump suspeito de vazio ($(stat -c %s "/tmp/$ARQ") bytes)" >&2; exit 1; }

aws s3 cp "/tmp/$ARQ" "s3://$BUCKET/backups/$ARQ" --only-show-errors
rm -f "/tmp/$ARQ"
echo "backup ok: s3://$BUCKET/backups/$ARQ"
