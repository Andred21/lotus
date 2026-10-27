#!/usr/bin/env bash
#
# Poda as imagens do Lotus que ficaram para trás no host (spec do bloco 42, §4).
#
# O deploy.sh sempre fez `pull` do SHA novo e nunca apagou nada. O disco do host
# chegou a 87% com 14 SHAs guardados, e disco cheio num host de produção derruba
# o banco e o próprio deploy. Este script é a limpeza que faltava.
#
# Quem chama: o deploy.sh, depois de gravar o CURRENT_SHA, com o SHA que acabou
# de ser promovido. A linha `fim` dessa promoção AINDA NÃO está no ledger (o trap
# de saída a escreve depois), então ela não entra na conta abaixo.
#
# O que fica: as imagens do SHA atual e do SHA anterior, só dos três repositórios
# do Lotus (lotus-app, lotus-web, lotus-clamav). O anterior é o alvo de rollback
# (runbook §8.1.1), e é por isso que ele não pode sair.
#
# O anterior vem do ledger, nunca do CURRENT_SHA: é o `sha` da ÚLTIMA linha `fim`
# com resultado `ok` cujo `sha` difere do atual. Se o mesmo SHA é promovido de
# novo, o CURRENT_SHA já é ele, e usá-lo como "anterior" apagaria o alvo de
# rollback sem ninguém notar. Fim com falha não conta: aquele SHA nunca subiu.
#
# Nunca `-f`: `docker image rm` sem força recusa a imagem que um container está
# usando, e essa recusa é a rede de proteção. Recusada vai ao stderr, as outras
# seguem, e o script sai 1 para o deploy saber que a poda ficou pela metade.
#
# Uso:  podar-imagens.sh <sha de 40 hexadecimais>
# Ambiente, opcional:
#   LOTUS_BASE   onde fica o releases.jsonl (default /opt/lotus)
# Saída: 0 nada recusado, 1 remoção recusada, prune ou listagem falhou, 2 uso.
#   stdout: `mantidas: <atual> <anterior|nenhum>`, depois `removida: <repo>:<tag>`
#   stderr: `recusada: <repo>:<tag>` (junto da mensagem do docker), `erro: ...`
set -euo pipefail

if [ $# -ne 1 ] || [ ${#1} -ne 40 ] || [ -n "$(printf '%s' "$1" | tr -d '0-9a-f')" ]; then
  echo "uso: podar-imagens.sh <sha de 40 hexadecimais>" >&2
  exit 2
fi
ATUAL="$1"

# Mesmo gancho do LOTUS_BASE dos vizinhos: o default é o caminho de produção, e
# o teste sobrescreve a variável para EXECUTAR o script contra um ledger de mentira.
BASE="${LOTUS_BASE:-/opt/lotus}"
LEDGER="$BASE/releases.jsonl"

# O `|| true` não é enfeite: com pipefail, um grep sem linha (ledger sem `fim`
# ok, ou só com o SHA atual) mataria o script aqui. Mesmo motivo do deploy.sh.
ANTERIOR=''
if [ -f "$LEDGER" ]; then
  ANTERIOR=$(grep -F '"evento":"fim"' "$LEDGER" | grep -F '"resultado":"ok"' \
    | sed -n 's/.*"sha":"\([0-9a-f]\{40\}\)".*/\1/p' | grep -vxF "$ATUAL" | tail -n 1 || true)
fi

echo "mantidas: $ATUAL ${ANTERIOR:-nenhum}"

# A listagem é capturada ANTES do laço: `done < <(docker image ls ...)` engoliria
# a falha do docker, e a poda sairia 0 sem ter olhado nada.
IMAGENS=$(docker image ls --format '{{.Repository}}:{{.Tag}}') \
  || { echo "erro: docker image ls falhou" >&2; exit 1; }

eh_sha() { [ ${#1} -eq 40 ] && [ -z "$(printf '%s' "$1" | tr -d '0-9a-f')" ]; }

STATUS=0
while IFS= read -r REF; do
  [ -n "$REF" ] || continue
  REPO="${REF%:*}"
  TAG="${REF##*:}"
  # Repositório EXATO: `ghcr.io/outro-dono/lotus-app` e `lotus-app-x` não são nossos.
  case "$REPO" in
    ghcr.io/gatika-cl/lotus-app | ghcr.io/gatika-cl/lotus-web | ghcr.io/gatika-cl/lotus-clamav) ;;
    *) continue ;;
  esac
  eh_sha "$TAG" || continue
  [ "$TAG" != "$ATUAL" ] || continue
  [ -z "$ANTERIOR" ] || [ "$TAG" != "$ANTERIOR" ] || continue

  # O stdout do docker vai para o limbo: a saída da poda é a do contrato.
  if docker image rm "$REF" >/dev/null </dev/null; then
    echo "removida: $REF"
  else
    echo "recusada: $REF" >&2
    STATUS=1
  fi
done < <(printf '%s\n' "$IMAGENS" | sort -u)

# Sem tag (as camadas que o `pull` deixa quando o `latest` anda): o `-f` aqui só
# dispensa a confirmação, o prune sem `-a` nunca toca imagem com tag.
docker image prune -f >/dev/null || { echo "erro: docker image prune falhou" >&2; STATUS=1; }

exit "$STATUS"
