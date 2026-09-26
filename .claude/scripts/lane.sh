#!/usr/bin/env bash
# Descobre, abre, confere e fecha lanes do harness de blocos
# (spec 2026-09-26-harness-paridade-eladecora-design.md, §3.2 e §4.1).
#
# Uma lane e uma worktree irma numa branch <tipo>/<NN>-<resto>. O main tree
# fica na main e nunca e lane. O estado de cada lane mora em
# docs/superpowers/blocos/<NN>-<resto>/estado.md, na arvore da propria lane.
#
# Contrato: toda recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, com
# exit 1, ANTES de criar ou destruir qualquer coisa. Sem `set -e`: cada passo
# que cria confere o proprio codigo, para a mensagem de falha poder dizer o
# que ja existe no disco. `docker` e `pnpm` entram por LANE_DOCKER e
# LANE_PNPM, para a suite nao subir conteiner nem baixar pacote.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/../hooks/lib/comum.sh"

LER_FM="$DIR/../hooks/lib/ler-frontmatter.py"
BACKLOG_PY="$DIR/lib/backlog.py"
DOCKER=${LANE_DOCKER:-docker}
PNPM=${LANE_PNPM:-pnpm}
PADRAO_LANE='^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$'
PADRAO_NN='^[1-9][0-9]*$'
PADRAO_SLUG='^[a-z0-9]+(-[a-z0-9]+)*$'
PADRAO_ALIAS='^[a-z0-9.-]+$'
TIPOS='feat fix chore refactor infra cicd docs'
TETO_LANES=3
# Unit Separator (0x1F), nao TAB: ver o docstring do ler-frontmatter.py.
SEP=$'\x1f'

recusar() {
  printf 'PORTAO RECUSOU: %s\n' "$1" >&2
  exit 1
}

emitir() {
  local IFS=$SEP
  printf '%s\n' "$*"
}

carregar_arvores() {
  # $1 = qualquer caminho do repositorio. Preenche ARV_CAMINHO e ARV_BRANCH na
  # ordem do `git worktree list`: o indice 0 e sempre o main tree.
  ARV_CAMINHO=()
  ARV_BRANCH=()
  local linha cam='' br=''
  while IFS= read -r linha; do
    case $linha in
      'worktree '*) cam=${linha#worktree }; br='(detached)' ;;
      'branch refs/heads/'*) br=${linha#branch refs/heads/} ;;
      '') [[ -n $cam ]] && { ARV_CAMINHO+=("$cam"); ARV_BRANCH+=("$br"); cam=''; } ;;
    esac
  done < <(git -C "$1" worktree list --porcelain 2>/dev/null; printf '\n')
}

raiz_ou_recusa() {
  RAIZ=$(raiz_de "$PWD")
  [[ -n $RAIZ ]] || recusar "fora de um repositorio git ($PWD)"
  carregar_arvores "$RAIZ"
  PRINCIPAL=${ARV_CAMINHO[0]}
}

exigir_main_tree() {
  # $1 = verbo, para a mensagem.
  [[ $(realpath -m "$RAIZ") == "$(realpath -m "$PRINCIPAL")" ]] \
    || recusar "$1 roda no main tree ($PRINCIPAL), e esta arvore e $RAIZ"
  local br
  br=$(branch_de "$RAIZ")
  [[ $br == main ]] || recusar "$1 exige o main tree na main, e ele esta em $br"
}

lanes_vivas() {
  # NN<US>arvore<US>branch por worktree que casa o padrao, fora o main tree.
  local i
  for i in "${!ARV_CAMINHO[@]}"; do
    (( i == 0 )) && continue
    [[ ${ARV_BRANCH[$i]} =~ $PADRAO_LANE ]] || continue
    emitir "$((10#${BASH_REMATCH[2]}))" "${ARV_CAMINHO[$i]}" "${ARV_BRANCH[$i]}"
  done
}

estado_da_lane() {
  # $1 = arvore, $2 = branch. A pasta do bloco e a branch sem o tipo.
  printf '%s/docs/superpowers/blocos/%s/estado.md' "$1" "${2#*/}"
}

verbo_descobrir() {
  (( $# == 0 )) || recusar "uso: lane.sh descobrir"
  raiz_ou_recusa
  local i cam br nn ws na off ref
  for i in "${!ARV_CAMINHO[@]}"; do
    (( i == 0 )) && continue
    cam=${ARV_CAMINHO[$i]}
    br=${ARV_BRANCH[$i]}
    if [[ $br =~ $PADRAO_LANE ]]; then
      nn=$((10#${BASH_REMATCH[2]}))
      ws=''; na=''; off=''
      IFS=$SEP read -r ws na off < <(python3 "$LER_FM" \
        "$(estado_da_lane "$cam" "$br")" workflow_state next_action offset)
      emitir lane "$nn" "$ws" "$br" "$cam" "$na" "$off"
    else
      emitir orfa "$cam" "$br"
    fi
  done
  # Branch de lane sem worktree: a assinatura de fechamento interrompido. A
  # do main tree entra na lista de "tem worktree" como qualquer outra.
  while IFS= read -r ref; do
    [[ $ref =~ $PADRAO_LANE ]] || continue
    nn=$((10#${BASH_REMATCH[2]}))
    printf '%s\n' "${ARV_BRANCH[@]}" | grep -qxF -- "$ref" && continue
    emitir sem-arvore "$nn" "$ref"
  done < <(git -C "$RAIZ" for-each-ref --format='%(refname:short)' refs/heads/)
}

verbo=${1:-}
(( $# > 0 )) && shift
case $verbo in
  descobrir) verbo_descobrir "$@" ;;
  *) recusar "verbo '$verbo' desconhecido; use descobrir, abrir, conferir ou fechar" ;;
esac
