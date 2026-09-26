# Ajudantes dos testes do lane.sh. Sourceado pelos *.tests.sh que precisam;
# nao e teste (o run-all.sh so pega *.tests.sh).

LANE_SH="$DIR_TESTES/../scripts/lane.sh"
LER_FM_TESTE="$DIR_HOOKS/lib/ler-frontmatter.py"
REAL_ENV_EXAMPLE="$DIR_TESTES/../../.env.example"
US=$'\x1f'

escrever_backlog() {
  # $1 = raiz. 30-33 imitam a cadeia real da paridade; 40 nao declara
  # Depende; 41-43 sao livres, para encher o teto.
  mkdir -p "$1/docs/superpowers"
  cat > "$1/docs/superpowers/backlog.md" <<'BACKLOG'
# Backlog — teste

## 30. `harness-estado-por-bloco`

**Prioridade:** P1 · **Frente:** Harness · **Contexto:** não · **Depende:** —

Escopo: o portao le a linha **Depende:** da ficha. Esta frase cita **Depende:** 33 e nao
e declaracao.

## 31. `harness-commands-de-bloco`

**Prioridade:** P1 · **Frente:** Harness · **Depende:** 30

## 32. `harness-aceitacao-externa`

**Prioridade:** P1 · **Frente:** Harness · **Depende:** 31

## 33. `harness-sinal-de-contexto-cheio`

**Prioridade:** P3 · **Frente:** Harness · **Depende:** —

## 40. `ficha-sem-depende`

**Prioridade:** P2 · **Frente:** Backend · **Contexto:** não

## 41. `livre-a`

**Prioridade:** P2 · **Frente:** Backend · **Depende:** —

## 42. `livre-b`

**Prioridade:** P2 · **Frente:** Frontend · **Depende:** —

## 43. `livre-c`

**Prioridade:** P2 · **Frente:** Infra · **Depende:** —

## Agrupados em bloco

Texto que nao e ficha.
BACKLOG
}

criar_main_lane() {
  # Main tree descartavel DENTRO de um diretorio pai proprio, porque as lanes
  # nascem como irmas (../lotus-<NN>-<slug>) e nao podem cair no TMPDIR
  # compartilhado. Ecoa o main tree; o chamador registra o descarte do PAI:
  #   _m=$(criar_main_lane); registrar_descarte "$(dirname "$_m")"
  # Mesma trava do criar_repo: sem pai, aborta sem ecoar caminho, porque
  # `git -C ""` cai no diretorio atual, que e o repo real.
  local pai raiz
  pai=$(mktemp -d "${TMPDIR:-/tmp}/lotus-lane-teste.XXXXXX") || pai=''
  if [[ -z $pai || ! -d $pai ]]; then
    printf 'ABORTADO: nao consegui criar pai descartavel; nao vou rodar git contra o repo real\n' >&2
    exit 1
  fi
  pai=$(realpath "$pai")
  raiz="$pai/lotus"
  mkdir -p "$raiz/backend" "$raiz/frontend"
  git -C "$raiz" init -q -b main
  git -C "$raiz" config user.email harness@lotus.local
  git -C "$raiz" config user.name 'Harness de teste'
  cp "$REAL_ENV_EXAMPLE" "$raiz/.env.example"
  printf '%s\n' '/.env*' '!/.env.example' '/backend/.env*' '/frontend/.env*' \
    '/frontend/node_modules' '/backend/vendor' > "$raiz/.gitignore"
  printf '{"name":"teste"}\n' > "$raiz/frontend/package.json"
  : > "$raiz/backend/.gitkeep"
  escrever_backlog "$raiz"
  git -C "$raiz" add -A
  git -C "$raiz" commit -q -m base
  # Os .env do main tree sao ignorados, como no repositorio real.
  printf 'APP_KEY=base64:teste\n' > "$raiz/backend/.env"
  printf 'VITE_ALGO=1\nVITE_API_URL=http://localhost:8080\n' > "$raiz/frontend/.env"
  printf '%s\n' "$raiz"
}

rodar_lane() {
  # $1 = diretorio de onde rodar; o resto vai para o lane.sh. Seta SAIDA_LANE
  # (stdout e stderr juntos) e CODIGO_LANE. pnpm e docker sao `true` por
  # padrao; FAKE_PNPM e FAKE_DOCKER, passados na frente da chamada, trocam.
  local dir=$1
  shift
  SAIDA_LANE=$(cd "$dir" && LANE_PNPM=${FAKE_PNPM:-true} LANE_DOCKER=${FAKE_DOCKER:-true} \
    bash "$LANE_SH" "$@" 2>&1)
  CODIGO_LANE=$?
}

lane_manual() {
  # $1 = main tree, $2 = branch. Worktree irma sem passar pelo abrir, para
  # montar cenario. Ecoa o caminho.
  local arv
  arv="$(dirname "$1")/lotus-${2#*/}"
  git -C "$1" worktree add -q -b "$2" "$arv" main >/dev/null 2>&1
  printf '%s\n' "$arv"
}

escrever_estado_lane() {
  # $1 arvore, $2 pasta (NN-slug), $3 workflow_state, $4 next_action,
  # $5 branch; $6.. linhas extras do frontmatter ('active_plan: x').
  local arv=$1 pasta=$2 ws=$3 na=$4 br=$5
  shift 5
  mkdir -p "$arv/docs/superpowers/blocos/$pasta"
  {
    printf -- '---\nschema_version: 3\nid: %s\nslug: %s\n' "${pasta%%-*}" "$pasta"
    printf 'workflow_state: %s\nnext_action: %s\nbranch: %s\noffset: 1\n' "$ws" "$na" "$br"
    (( $# > 0 )) && printf '%s\n' "$@"
    printf -- '---\n'
  } > "$arv/docs/superpowers/blocos/$pasta/estado.md"
}

linha_com_prefixo() {
  # $1 = texto, $2 = prefixo. Ecoa a primeira linha que comeca com o prefixo.
  printf '%s\n' "$1" | awk -v p="$2" 'index($0, p) == 1 { print; exit }'
}
