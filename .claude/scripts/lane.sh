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

portas_do_offset() {
  # A formula da tabela do .env.example. O MinIO anda de dois em dois porque
  # publica duas portas (API e console).
  local o=$1
  printf '%s %s %s %s %s %s\n' "$((8080 + o))" "$((3307 + o))" "$((8025 + o))" \
    "$((9000 + 2 * o))" "$((9001 + 2 * o))" "$((5173 + o))"
}

escrever_env() {
  # $1 = arvore, $2 = offset. Parte do .env.example da propria arvore e troca
  # so as seis portas; confere que as seis sairam, para uma chave renomeada no
  # molde nao virar lane na porta do offset zero em silencio.
  local http db mail minio console vite
  read -r http db mail minio console vite <<<"$(portas_do_offset "$2")"
  local esperadas
  esperadas=$(printf '%s\n' \
    "LOTUS_DEV_HTTP_PORT=$http" "LOTUS_DEV_DB_PORT=$db" \
    "LOTUS_DEV_MAILPIT_PORT=$mail" "LOTUS_DEV_MINIO_PORT=$minio" \
    "LOTUS_DEV_MINIO_CONSOLE_PORT=$console" "LOTUS_DEV_VITE_PORT=$vite")
  local -a sed_args=()
  local linha
  while IFS= read -r linha; do
    sed_args+=(-e "s/^[[:space:]]*#?[[:space:]]*${linha%%=*}=.*/$linha/")
  done <<<"$esperadas"
  sed -E "${sed_args[@]}" "$1/.env.example" > "$1/.env" || return 1
  [[ $(grep -cxFf <(printf '%s\n' "$esperadas") "$1/.env") == 6 ]]
}

copiar_envs() {
  # $1 = arvore. backend/.env e frontend/.env nao sao versionados: vem do main
  # tree. VITE_API_URL ativa amarraria o dev server da lane a API do offset
  # zero, entao sai comentada (passo 3 da receita do .env.example).
  local f
  for f in backend/.env frontend/.env; do
    if [[ -f $PRINCIPAL/$f ]]; then
      cp "$PRINCIPAL/$f" "$1/$f" || return 1
    else
      printf 'aviso: o main tree nao tem %s; a lane fica sem ele\n' "$f"
    fi
  done
  if [[ -f $1/frontend/.env ]]; then
    sed -i -E 's/^([[:space:]]*VITE_API_URL=)/# \1/' "$1/frontend/.env" || return 1
  fi
  return 0
}

semear_estado() {
  # $1 arvore, $2 NN, $3 pasta (NN-slug), $4 branch, $5 offset, $6 SHA da
  # main, $7 alias do modelo. Campos da secao 3.3 da spec; o contrato de
  # cada um esta em docs/superpowers/state.md.
  local pasta="$1/docs/superpowers/blocos/$3"
  mkdir -p "$pasta" || return 1
  cat > "$pasta/estado.md" <<ESTADO
---
schema_version: 3
id: $2
slug: $3
workflow_state: planning
next_owner: claude
next_action: continue_active_planning
resume_state: null
active_spec: null
active_plan: null
active_review: null
active_acceptance: null
context_packet: null
efeito_externo: null
executor: null
branch: $4
worktree: ../lotus-$3
offset: $5
lane_base: $6
commit: $6
blocker: null
updated_at: $(date -Iseconds)
updated_by: $(id -un)@$(hostname -s) / $7
---

# Bloco $2 — estado

Aberto por lane.sh abrir. O contrato dos campos esta em docs/superpowers/state.md.
ESTADO
}

falhar_no_meio() {
  # $1 = NN, $2 = o passo que falhou. CRIADO lista o que ja existe no disco.
  local ja='nada'
  (( ${#CRIADO[@]} > 0 )) && ja=$(printf '%s; ' "${CRIADO[@]}")
  printf 'LANE PELA METADE: %s falhou. Ja existe: %s Desfaca com: bash .claude/scripts/lane.sh fechar %s\n' \
    "$2" "$ja" "$1" >&2
  exit 1
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

  local base pasta="$nn-$slug"
  base=$(git -C "$RAIZ" rev-parse --short main)
  CRIADO=()
  git -C "$RAIZ" worktree add -q -b "$branch" "$arvore" main \
    || falhar_no_meio "$nn" 'git worktree add'
  CRIADO+=("a branch $branch" "a arvore $arvore")
  escrever_env "$arvore" "$offset" || falhar_no_meio "$nn" 'o .env da raiz'
  copiar_envs "$arvore" || falhar_no_meio "$nn" 'a copia de backend/.env e frontend/.env'
  (cd "$arvore/frontend" && "$PNPM" install --frozen-lockfile) \
    || falhar_no_meio "$nn" "$PNPM install --frozen-lockfile"
  semear_estado "$arvore" "$nn" "$pasta" "$branch" "$offset" "$base" "$modelo" \
    || falhar_no_meio "$nn" 'a semente do estado.md'
  # Sem este commit o fechar recusaria a arvore suja pelo proprio estado.md.
  { git -C "$arvore" add "docs/superpowers/blocos/$pasta/estado.md" \
      && git -C "$arvore" commit -q -m "chore($nn): abre a lane $slug"; } \
    || falhar_no_meio "$nn" 'o commit da semente'

  local http db mail minio console vite
  read -r http db mail minio console vite <<<"$(portas_do_offset "$offset")"
  printf 'LANE ABERTA: %s em %s\n' "$branch" "$arvore"
  printf '  portas: HTTP %s, DB %s, Mailpit %s, MinIO %s/%s, Vite %s\n' \
    "$http" "$db" "$mail" "$minio" "$console" "$vite"
  printf '  proximo passo, quando o bloco precisar do stack: (cd %s && docker compose up -d)\n' "$arvore"
}

arquivos_do_plano() {
  # $1 = plano.md. Os caminhos entre crases das linhas
  # `- Create|Modify|Test|Delete:` dos blocos **Files:**, sem o sufixo :linha,
  # um por linha, ordenados e unicos. Crase fora dessas linhas nao conta.
  grep -E '^[[:space:]]*- (Create|Modify|Test|Delete):' "$1" \
    | grep -oE '`[^`]+`' | tr -d '`' | sed -E 's/:[0-9]+(-[0-9]+)?$//' | LC_ALL=C sort -u
}

verbo_conferir() {
  (( $# == 1 )) || recusar "uso: lane.sh conferir <NN>"
  local nn=$1
  [[ $nn =~ $PADRAO_NN ]] || recusar "NN '$nn' nao e numero de ficha"
  raiz_ou_recusa
  local n c b meu=''
  local -a outros=()
  while IFS=$SEP read -r n c b; do
    if [[ $n == "$nn" ]]; then
      meu="$c/docs/superpowers/blocos/${b#*/}/plano.md"
    else
      outros+=("$c/docs/superpowers/blocos/${b#*/}/plano.md")
    fi
  done < <(lanes_vivas)
  [[ -n $meu ]] || recusar "nenhuma lane viva com o numero $nn"
  [[ -f $meu ]] || recusar "a lane $nn nao tem plano em $meu"
  local meus p comuns lidos=0 achou=0
  meus=$(arquivos_do_plano "$meu")
  for p in "${outros[@]}"; do
    [[ -f $p ]] || continue
    lidos=$((lidos + 1))
    comuns=$(LC_ALL=C comm -12 <(printf '%s\n' "$meus") <(arquivos_do_plano "$p"))
    [[ -z $comuns ]] && continue
    achou=1
    printf 'CONFLITO: %s e %s tocam os mesmos arquivos:\n' "$meu" "$p"
    printf '%s\n' "$comuns" | sed 's/^/  /'
  done
  (( achou == 0 )) || exit 1
  printf 'SEM CONFLITO: lane %s contra %s plano(s)\n' "$nn" "$lidos"
}

verbo_fechar() {
  local forca=0
  if (( $# == 2 )) && [[ $2 == --force ]]; then
    forca=1
  elif (( $# != 1 )); then
    recusar "uso: lane.sh fechar <NN> [--force]"
  fi
  local nn=$1
  [[ $nn =~ $PADRAO_NN ]] || recusar "NN '$nn' nao e numero de ficha"
  raiz_ou_recusa
  exigir_main_tree fechar
  local n c b cam='' br=''
  while IFS=$SEP read -r n c b; do
    [[ $n == "$nn" ]] && { cam=$c; br=$b; }
  done < <(lanes_vivas)
  [[ -n $cam ]] || recusar "nenhuma lane viva com o numero $nn"
  # Arquivo ignorado nao conta: os .env e o node_modules saem junto com a
  # arvore. O resto e trabalho que o fechar apagaria.
  [[ -z $(git -C "$cam" status --porcelain 2>/dev/null) ]] \
    || recusar "a arvore $cam tem mudanca nao commitada; nem --force passa por cima disso"
  if (( forca == 0 )); then
    git -C "$RAIZ" merge-base --is-ancestor "$br" main \
      || recusar "a branch $br nao esta mesclada na main; fechar agora apagaria commits"
  fi

  # Daqui para baixo destroi. O banco de dev da lane morre com ela, de
  # proposito: volume (-v) e a imagem do app construida para esta arvore
  # (--rmi local). Sem teste de "o projeto tem conteiner?" antes: down num
  # projeto vazio e no-op, e o teste seria so mais um jeito de errar.
  if command -v "$DOCKER" >/dev/null 2>&1; then
    (cd "$cam" && "$DOCKER" compose down -v --rmi local) || {
      printf 'FECHAMENTO PELA METADE: docker compose down falhou em %s; a arvore e a branch ficaram\n' "$cam" >&2
      exit 1
    }
  else
    printf 'aviso: %s ausente, nenhum stack para derrubar\n' "$DOCKER"
  fi
  git -C "$RAIZ" worktree remove "$cam" || {
    printf 'FECHAMENTO PELA METADE: git worktree remove falhou em %s; o stack ja caiu\n' "$cam" >&2
    exit 1
  }
  local flag=-d
  (( forca == 1 )) && flag=-D
  git -C "$RAIZ" branch -q "$flag" "$br" || {
    printf 'FECHAMENTO PELA METADE: git branch %s %s falhou; a arvore ja foi removida\n' "$flag" "$br" >&2
    exit 1
  }
  printf 'LANE FECHADA: %s, arvore %s removida\n' "$br" "$cam"
}

verbo=${1:-}
(( $# > 0 )) && shift
case $verbo in
  descobrir) verbo_descobrir "$@" ;;
  abrir)     verbo_abrir "$@" ;;
  conferir)  verbo_conferir "$@" ;;
  fechar)    verbo_fechar "$@" ;;
  *) recusar "verbo '$verbo' desconhecido; use descobrir, abrir, conferir ou fechar" ;;
esac
