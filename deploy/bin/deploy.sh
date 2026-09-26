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

# Um deploy por vez NO HOST. O `concurrency` do workflow enfileira dois runs da
# Actions, mas não sabe que o João pode estar rodando este script por SSH ao
# mesmo tempo — e o inverso também vale. As duas camadas cobrem coisas
# diferentes; nenhuma sozinha cobre as duas.
# O fd abre em APPEND de propósito: `exec 9>` truncaria o arquivo ANTES do
# flock, e quem chegasse segundo apagaria o PID de quem chegou primeiro,
# justamente a informação que a mensagem de recusa precisa dar.
exec 9>>"$BASE/.deploy.lock"
if ! flock -n 9; then
  echo "erro: outro deploy ja esta rodando (pid $(cat "$BASE/.deploy.pid" 2>/dev/null || echo '?'))" >&2
  exit 3
fi
printf '%s\n' "$$" > "$BASE/.deploy.pid"

LEDGER="$BASE/releases.jsonl"
[ -f "$LEDGER" ] || install -m 640 /dev/null "$LEDGER"
ATOR="${LOTUS_DEPLOY_ATOR:-manual:$(id -un)}"
ETAPA=inicio
INICIO_ESCRITO=0

agora() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# Uma linha por evento, em append. `>>` com linha curta e' escrita atomica no
# Linux, e o flock da linha de cima ja garante escritor unico de qualquer jeito.
ledger() { printf '%s\n' "$1" >> "$LEDGER"; }

# Nome de migration do Laravel e' [A-Za-z0-9_]. Qualquer coisa fora disso aborta
# em vez de produzir JSON quebrado no unico registro que sobra quando o banco
# esta fora do ar — que e' exatamente quando se le este arquivo.
json_lista() {
  local nome saida=""
  while IFS= read -r nome; do
    [ -n "$nome" ] || continue
    printf '%s' "$nome" | grep -qE '^[A-Za-z0-9_]+$' \
      || { echo "erro: nome de migration inesperado: $nome" >&2; exit 1; }
    saida="$saida,\"$nome\""
  done
  printf '[%s]' "${saida#,}"
}

# A chave do dump que precede a migration $1: o `dump` da ULTIMA linha `inicio`
# cuja lista a contem. Ultima, e nao primeira: release refeita (deploy morto
# depois do dump, ou volta e nova promocao) registra a migration de novo, e o
# dump mais recente e' o banco mais novo ANTES dela — o que perde menos dado.
# O nome vai entre aspas: json_lista so admite [A-Za-z0-9_]+, entao "x" casa o
# elemento inteiro e nunca o prefixo de "x_y". Sem linha, ou com "dump": null,
# a saida e' vazia. O `|| true` nao e' enfeite: com pipefail, grep sem match
# mataria o script aqui, antes de a recusa dizer o que fazer.
dump_que_introduziu() {
  grep -F '"evento":"inicio"' "$LEDGER" | grep -F "\"$1\"" | tail -n 1 \
    | sed -n 's/.*"dump":"\([^"]*\)".*/\1/p' || true
}

# Tentativa interrompida deixa `inicio` sem `fim`. Isso nao e' buraco: e' a
# informacao que se quer quando o deploy morreu no meio, e e' ela que aponta o
# dump. O trap fecha o que der para fechar.
ao_sair() {
  local codigo=$?
  if [ "$INICIO_ESCRITO" = 1 ]; then
    if [ "$codigo" = 0 ]; then
      ledger '{"ts":"'"$(agora)"'","evento":"fim","sha":"'"$SHA"'","resultado":"ok","etapa":"ok"}'
    else
      ledger '{"ts":"'"$(agora)"'","evento":"fim","sha":"'"$SHA"'","resultado":"falha","etapa":"'"$ETAPA"'"}'
    fi
  fi
  exit "$codigo"
}
trap ao_sair EXIT

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

echo "==> gate de schema"
MYSQL=$(compose ps -q mysql)
[ -n "$MYSQL" ] || { echo "erro: servico mysql nao esta de pe" >&2; exit 1; }

# APLICADAS: o que o BANCO realmente tem. Lido da tabela, nao suposto.
APLICADAS=$(docker exec "$MYSQL" sh -c \
  'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT migration FROM migrations" "$MYSQL_DATABASE"' \
  | sort)
# CONHECIDAS: o que a IMAGEM ALVO sabe. Diff de arquivos entre dois SHAs nao
# serve: ele nao enxerga `change()` nem `rename` destrutivo, e e exatamente por
# isso que a medicao sai da imagem que vai rodar.
CONHECIDAS=$(docker run --rm --entrypoint sh "$APP" -c 'ls /var/www/database/migrations' \
  | sed 's/\.php$//' | sort)

A_FRENTE=$(comm -23 <(printf '%s\n' "$APLICADAS") <(printf '%s\n' "$CONHECIDAS"))
PENDENTES=$(comm -13 <(printf '%s\n' "$APLICADAS") <(printf '%s\n' "$CONHECIDAS"))

if [ -n "$A_FRENTE" ]; then
  echo "erro: o banco esta A FRENTE de $SHA — a imagem alvo nao conhece:" >&2
  # A lista sai do `comm`, ja ordenada — e nome de migration comeca pela data,
  # entao a primeira linha e' a mais antiga, e o dump dela e' o que desfaz todas.
  for M in $A_FRENTE; do
    CHAVE=$(dump_que_introduziu "$M")
    echo "  $M  (dump anterior: ${CHAVE:-nenhum registrado no ledger})" >&2
  done
  echo "restaure o dump da PRIMEIRA linha — a migration mais antiga — e so entao promova." >&2
  # O escape existe para o operador com o dump na mao. O WORKFLOW nunca define
  # esta variavel (catraca em workflow-deploy.test.ts), entao o caminho
  # automatizado nao tem como contornar o gate.
  [ "${LOTUS_ACEITAR_SCHEMA_A_FRENTE:-0}" = "1" ] || exit 4
  echo "aviso: LOTUS_ACEITAR_SCHEMA_A_FRENTE=1 — seguindo por sua conta." >&2
fi

ANTERIOR=$(cat "$BASE/CURRENT_SHA" 2>/dev/null || true)
if [ -n "$ANTERIOR" ]; then ANTERIOR_JSON="\"$ANTERIOR\""; else ANTERIOR_JSON=null; fi

DUMP_JSON=null
if [ -n "$PENDENTES" ]; then
  echo "==> dump pre-deploy (ha migration pendente)"
  # Deploy sem migration nao precisa de dump para voltar: o gate acima ja prova
  # que o alvo anterior e' limpo. Se o dump passar a custar minutos, ele sai do
  # caminho critico — o gatilho esta escrito no runbook.
  SAIDA_DUMP=$(mktemp)
  # Falha do backup ABORTA o deploy: promover sem a evidencia de rollback e'
  # promover sem rede, e o `set -e` ja faz isso valer.
  LOTUS_BACKUP_SAIDA="$SAIDA_DUMP" "$BASE/bin/backup-db.sh"
  DUMP_JSON="\"$(cat "$SAIDA_DUMP")\""
  rm -f "$SAIDA_DUMP"
fi

MIGRACOES_JSON=$(printf '%s\n' "$PENDENTES" | json_lista)
ledger '{"ts":"'"$(agora)"'","evento":"inicio","sha":"'"$SHA"'","sha_anterior":'"$ANTERIOR_JSON"',"migrations":'"$MIGRACOES_JSON"',"dump":'"$DUMP_JSON"',"ator":"'"$ATOR"'"}'
INICIO_ESCRITO=1

ETAPA=migrate
echo "==> migrate"
compose run --rm app php artisan migrate --force

ETAPA=up
echo "==> up"
compose up -d --no-build --pull never

ETAPA=health
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

ETAPA=digests
for PAR in "app:$APP" "nginx:$WEB" "clamav:$CLAM"; do
  SERVICO="${PAR%%:*}"; ALVO="${PAR#*:}"
  ID_PUXADO=$(docker image inspect --format '{{.Id}}' "$ALVO")
  ID_RODANDO=$(docker inspect --format '{{.Image}}' "$(compose ps -q "$SERVICO")")
  [ "$ID_PUXADO" = "$ID_RODANDO" ] || { echo "erro: $SERVICO roda imagem diferente da puxada" >&2; exit 1; }
done

# `>` trunca e só depois escreve: processo morto entre as duas coisas deixa o
# host sem saber que SHA está rodando. `mv` dentro do mesmo sistema de arquivos
# é rename(2), que é atômico — ou o arquivo é o antigo, ou é o novo.
NOVO=$(mktemp "$BASE/.current_sha.XXXXXX")
printf '%s\n' "$SHA" > "$NOVO"
chmod 644 "$NOVO"
mv -f "$NOVO" "$BASE/CURRENT_SHA"
echo "==> DEPLOY OK: $SHA"
