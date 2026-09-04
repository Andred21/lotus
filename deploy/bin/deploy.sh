#!/usr/bin/env bash
#
# Deploy por SHA no host de produção (spec v2 do item 10, §11).
# Sequência: login -> pull -> migrate -> up -> /up -> digests -> CURRENT_SHA.
# Rollback: rodar de novo com o SHA anterior (migration incompatível é limite
# declarado — estratégia é do item 12).
#
# Uso:  deploy.sh <sha de 40 hexadecimais>
# Pré:  /opt/lotus/.env, /opt/lotus/ghcr.token (PAT read:packages),
#       /opt/lotus/docker-compose.prod.yml (e o overlay TLS, se ativo).
set -euo pipefail

SHA="${1:-}"
if [ ${#SHA} -ne 40 ] || [ -n "$(printf '%s' "$SHA" | tr -d '0-9a-f')" ]; then
  echo "uso: deploy.sh <sha de 40 hexadecimais>" >&2
  exit 2
fi

BASE=/opt/lotus
DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"
APP="ghcr.io/$DONO/lotus-app:$SHA"
WEB="ghcr.io/$DONO/lotus-web:$SHA"
# O antivirus tambem e imagem NOSSA desde 2026-09-04: clamav/clamav so publica
# linux/amd64 e este host e t4g/Graviton. Promovida pelo mesmo SHA que o resto.
CLAM="ghcr.io/$DONO/lotus-clamav:$SHA"

ARQUIVOS=(-f "$BASE/docker-compose.prod.yml")
# O overlay TLS entra sozinho quando o cert já foi emitido (runbook §11).
if [ -f "$BASE/nginx/tls.conf" ] && [ -d /etc/letsencrypt/live ]; then
  ARQUIVOS+=(-f "$BASE/docker-compose.prod-tls.yml")
fi

compose() {
  LOTUS_IMAGE="$APP" LOTUS_WEB_IMAGE="$WEB" LOTUS_CLAMAV_IMAGE="$CLAM" LOTUS_ENV_FILE="$BASE/.env" \
    docker compose -p lotus --project-directory "$BASE" "${ARQUIVOS[@]}" "$@"
}

echo "==> login ghcr.io"
docker login ghcr.io -u "$DONO" --password-stdin < "$BASE/ghcr.token" >/dev/null

echo "==> manifestos de $SHA"
docker manifest inspect "$APP" >/dev/null
docker manifest inspect "$WEB" >/dev/null
docker manifest inspect "$CLAM" >/dev/null

echo "==> pull"
compose pull --quiet

echo "==> migrate"
compose run --rm app php artisan migrate --force

echo "==> up"
compose up -d --no-build --pull never

echo "==> esperando o nginx ficar healthy (até 150 s)"
NGINX=$(compose ps -q nginx)
ESTADO="?"
for _ in $(seq 1 30); do
  ESTADO=$(docker inspect --format '{{.State.Health.Status}}' "$NGINX" 2>/dev/null || echo "?")
  [ "$ESTADO" = "healthy" ] && break
  [ "$ESTADO" = "unhealthy" ] && { compose logs --tail 50 nginx app >&2; exit 1; }
  sleep 5
done
[ "$ESTADO" = "healthy" ] || { echo "erro: nginx $ESTADO após 150 s" >&2; exit 1; }

CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1/up" || echo 000)
[ "$CODIGO" = "200" ] || { echo "erro: /up respondeu $CODIGO" >&2; exit 1; }

for PAR in "app:$APP" "nginx:$WEB" "clamav:$CLAM"; do
  SERVICO="${PAR%%:*}"; ALVO="${PAR#*:}"
  ID_PUXADO=$(docker image inspect --format '{{.Id}}' "$ALVO")
  ID_RODANDO=$(docker inspect --format '{{.Image}}' "$(compose ps -q "$SERVICO")")
  [ "$ID_PUXADO" = "$ID_RODANDO" ] || { echo "erro: $SERVICO roda imagem diferente da puxada" >&2; exit 1; }
done

echo "$SHA" > "$BASE/CURRENT_SHA"
echo "==> DEPLOY OK: $SHA"
