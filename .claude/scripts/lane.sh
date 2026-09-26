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

offset_da_arvore() {
  # $1 = arvore. O offset e o que o .env da raiz dela publica, porque e o que
  # o compose le: LOTUS_DEV_HTTP_PORT - 8080. Sem .env ou sem a chave, 0.
  local porta
  porta=$(sed -nE "s/^[[:space:]]*LOTUS_DEV_HTTP_PORT=[\"']?([0-9]+)[\"']?[[:space:]]*\$/\1/p" \
    "$1/.env" 2>/dev/null | tail -n 1)
  [[ -n $porta ]] || { printf '0'; return 0; }
  printf '%s' "$((10#$porta - 8080))"
}

offset_livre() {
  # Ocupado e o que o .env de TODA arvore publica — lane, orfa ou main —,
  # porque arvore fora do padrao de lane tambem sobe stack. Em 2026-09-26
  # ../lotus-infra estava em +1 e ../fix-frontend em +2, as duas orfas: ler
  # so o estado.md das lanes reservaria +1 e colidiria.
  local -a ocupados=()
  local i o
  for i in "${!ARV_CAMINHO[@]}"; do
    ocupados+=("$(offset_da_arvore "${ARV_CAMINHO[$i]}")")
  done
  for o in 1 2 3; do
    [[ " ${ocupados[*]} " == *" $o "* ]] || { printf '%s' "$o"; return 0; }
  done
  return 1
}

descrever_offsets() {
  local i
  for i in "${!ARV_CAMINHO[@]}"; do
    printf '+%s em %s; ' "$(offset_da_arvore "${ARV_CAMINHO[$i]}")" "${ARV_CAMINHO[$i]}"
  done
}

verbo_abrir() {
  local nn=${1:-} tipo=${2:-} slug=${3:-} modelo=terminal
  if (( $# == 5 )) && [[ $4 == --modelo ]]; then
    modelo=$5
  elif (( $# != 3 )); then
    recusar "uso: lane.sh abrir <NN> <tipo> <slug> [--modelo <alias>]"
  fi
  [[ $nn =~ $PADRAO_NN ]] || recusar "NN '$nn' nao e numero de ficha"
  [[ " $TIPOS " == *" $tipo "* ]] || recusar "tipo '$tipo' fora de: $TIPOS"
  [[ $slug =~ $PADRAO_SLUG ]] || recusar "slug '$slug' fora de $PADRAO_SLUG"
  [[ $modelo =~ $PADRAO_ALIAS ]] || recusar "alias de modelo '$modelo' fora de $PADRAO_ALIAS"

  raiz_ou_recusa
  # 1. main tree, na main
  exigir_main_tree abrir
  local backlog="$RAIZ/docs/superpowers/backlog.md"
  [[ -f $backlog ]] || recusar "sem $backlog"
  [[ -f $RAIZ/.env.example ]] || recusar "sem .env.example na raiz, de onde sai o .env da lane"

  # 2. a ficha existe e o slug e o dela
  local ficha slug_ficha deps
  ficha=$(python3 "$BACKLOG_PY" ficha "$backlog" "$nn")
  [[ -n $ficha ]] || recusar "a ficha $nn nao existe no backlog.md"
  IFS=$SEP read -r slug_ficha deps <<<"$ficha"
  [[ $slug_ficha == "$slug" ]] \
    || recusar "o slug '$slug' nao bate com o da ficha $nn ('$slug_ficha')"

  # 3. a ficha declara **Depende:** (falha fechada)
  [[ $deps != SEM-DEPENDE ]] \
    || recusar "a linha **Prioridade:** da ficha $nn nao tem **Depende:**; o Joao declara '—' para nenhuma"

  # 4. teto de lanes
  local -a nums=() branches=()
  local n c b
  while IFS=$SEP read -r n c b; do
    nums+=("$n")
    branches+=("$b")
  done < <(lanes_vivas)
  (( ${#nums[@]} < TETO_LANES )) || recusar "ja ha $TETO_LANES lanes vivas: ${branches[*]}"

  # 5. dependencia cruzando lane viva, nos dois sentidos, transitivamente
  local conflitos
  conflitos=$(python3 "$BACKLOG_PY" conflito "$backlog" "$nn" "${nums[@]}")
  [[ -z $conflitos ]] || recusar "a dependencia cruza lane viva: ${conflitos//$'\n'/; }"

  # 6. branch ou caminho ja existem
  local branch="$tipo/$nn-$slug"
  local arvore
  arvore="$(dirname "$PRINCIPAL")/lotus-$nn-$slug"
  ! git -C "$RAIZ" show-ref --verify --quiet "refs/heads/$branch" \
    || recusar "a branch $branch ja existe"
  [[ ! -e $arvore ]] || recusar "o caminho $arvore ja existe"

  # 7. offset livre de 1 a 3
  local offset
  offset=$(offset_livre) || recusar "nenhum offset livre de 1 a 3: $(descrever_offsets)"

  printf 'PORTAO OK: %s pode abrir em %s, offset +%s\n' "$branch" "$arvore" "$offset"
}

verbo=${1:-}
(( $# > 0 )) && shift
case $verbo in
  descobrir) verbo_descobrir "$@" ;;
  abrir)     verbo_abrir "$@" ;;
  *) recusar "verbo '$verbo' desconhecido; use descobrir, abrir, conferir ou fechar" ;;
esac
