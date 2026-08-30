#!/usr/bin/env bash
#
# Prova que o par de imagens publicado no GHCR para um SHA SOBE e responde,
# pela mesma sequencia que o servidor de producao fara:
#
#   login -> pull -> migrate -> up -> /up
#
# Por que existe: o job `image` verde diz que o par EXISTE no registry, nao que
# ele roda. Ate 2026-08-29 ninguem tinha puxado o par corporativo -- as provas
# do runtime (item 10) usaram imagem construida localmente. Este script e a
# especificacao executavel do que o host fara no deploy (item 12), e roda aqui,
# sem nuvem: MySQL, MinIO e Mailpit vem do overlay de sonda.
#
# O que ele NAO faz, de proposito: nao constroi imagem (`--no-build`), nao puxa
# nada por baixo dos panos no `up` (`--pull never`), nao toca a stack de dev
# (projeto Compose proprio, `lotus-release`) e nao deixa nada para tras
# (`down -v` em trap, com sucesso ou sem).
#
# Uso:
#   scripts/provar-release.sh <sha de 40 hexadecimais>
#
# O dono do registry sai do remote `upstream` (o corporativo, em minusculas,
# como o job `image` escreve). Para provar o par de outro dono:
#   LOTUS_RELEASE_OWNER=andred21 scripts/provar-release.sh <sha>
#
# Credencial: o pacote corporativo e privado. Antes de rodar, `docker login
# ghcr.io -u <usuario> --password-stdin` com um PAT classico de escopo
# `read:packages`. O token vive no credential store do Docker, nunca em
# arquivo do repositorio.
#
# Portas: a sonda ocupa 8081 (nginx), 9002 (MinIO) e 8026 (Mailpit) -- as do
# offset +1 do .env.example. Ocupadas, o Compose falha alto com "port is
# already allocated" (ADR-13) e o trap limpa o que chegou a subir.
set -euo pipefail

SHA="${1:-}"
if [ ${#SHA} -ne 40 ] || [ -n "$(printf '%s' "$SHA" | tr -d '0-9a-f')" ]; then
  echo "uso: scripts/provar-release.sh <sha de 40 hexadecimais>" >&2
  exit 2
fi

RAIZ=$(git rev-parse --show-toplevel)
cd "$RAIZ"

if [ -n "${LOTUS_RELEASE_OWNER:-}" ]; then
  DONO="$LOTUS_RELEASE_OWNER"
else
  DONO=$(git remote get-url upstream 2>/dev/null \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#/.*$##') || DONO=""
fi
DONO="${DONO,,}"
if [ -z "$DONO" ]; then
  echo "erro: nao ha remote upstream para ler o dono do registry; informe LOTUS_RELEASE_OWNER=<dono>." >&2
  exit 2
fi

APP="ghcr.io/$DONO/lotus-app:$SHA"
WEB="ghcr.io/$DONO/lotus-web:$SHA"
PROJETO=lotus-release
PORTA=8081

compose() {
  LOTUS_IMAGE="$APP" LOTUS_WEB_IMAGE="$WEB" LOTUS_ENV_FILE=docker/probe.env LOTUS_HTTP_PORT="$PORTA" \
    docker compose -p "$PROJETO" -f docker-compose.prod.yml -f docker-compose.prod-probe.yml "$@"
}

limpar() {
  echo "==> derrubando o projeto $PROJETO (down -v)"
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}
trap limpar EXIT

# ── pre-condicao: os dois manifestos, antes de tocar o Docker local ──────────
echo "==> conferindo os manifestos de $SHA em ghcr.io/$DONO"
for alvo in "$APP" "$WEB"; do
  if ! docker manifest inspect "$alvo" >/dev/null 2>&1; then
    echo "erro: nao foi possivel ler $alvo." >&2
    echo "      ou o par nao existe para este SHA (o job image nao terminou verde para ele)," >&2
    echo "      ou falta credencial de leitura: PAT classico com escopo read:packages e" >&2
    echo "        docker login ghcr.io -u <usuario> --password-stdin" >&2
    exit 1
  fi
done
echo "    app e web existem."

# ── a sequencia do host ──────────────────────────────────────────────────────
echo "==> pull"
compose pull --quiet

# `migrate` nao mora no entrypoint (item 10, D7): o fluxo de deploy e
# pull -> migrate -> up, e e ele que se prova aqui. `run` sobe as dependencias
# do app (mysql ate healthy, minio, gotenberg, clamav) antes de executar.
echo "==> migrate"
compose run --rm app php artisan migrate --force

echo "==> up"
compose up -d --no-build --pull never

# O healthcheck do nginx atravessa nginx -> FPM -> /up do Laravel; esperar por
# ele e esperar pela cadeia inteira. Teto de 150 s: start_period 30 s + 5
# tentativas x 15 s = 105 s no compose, com folga.
echo "==> esperando o nginx ficar healthy (ate 150 s)"
NGINX=$(compose ps -q nginx)
ESTADO="?"
for _ in $(seq 1 30); do
  ESTADO=$(docker inspect --format '{{.State.Health.Status}}' "$NGINX" 2>/dev/null || echo "?")
  [ "$ESTADO" = "healthy" ] && break
  if [ "$ESTADO" = "unhealthy" ]; then
    echo "erro: nginx unhealthy." >&2
    compose logs --tail 50 nginx app >&2 || true
    exit 1
  fi
  sleep 5
done
if [ "$ESTADO" != "healthy" ]; then
  echo "erro: nginx nao ficou healthy em 150 s (ultimo estado: $ESTADO)." >&2
  compose logs --tail 50 nginx app >&2 || true
  exit 1
fi

CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/up" || echo "000")
if [ "$CODIGO" != "200" ]; then
  echo "erro: GET /up respondeu $CODIGO, esperado 200." >&2
  compose logs --tail 50 nginx app >&2 || true
  exit 1
fi

# O que esta rodando e o que foi puxado? O ID da imagem do container tem de
# ser o ID da imagem puxada por tag -- sem isso, um lotus-app antigo poderia
# estar respondendo o /up.
ID_APP=$(docker image inspect --format '{{.Id}}' "$APP")
ID_RODANDO=$(docker inspect --format '{{.Image}}' "$(compose ps -q app)")
if [ "$ID_APP" != "$ID_RODANDO" ]; then
  echo "erro: o container app roda $ID_RODANDO, mas a imagem puxada e $ID_APP." >&2
  exit 1
fi

echo ""
echo "==> RELEASE PROVADO: $SHA"
echo "    app  $(docker image inspect --format '{{index .RepoDigests 0}}' "$APP")"
echo "    web  $(docker image inspect --format '{{index .RepoDigests 0}}' "$WEB")"
echo "    GET http://127.0.0.1:$PORTA/up -> $CODIGO"
