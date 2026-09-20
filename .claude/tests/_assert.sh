# Asserter minimo da suite do harness. Sem dependencia externa.
# O contador e global porque run-all.sh faz `source` de cada arquivo de teste,
# e nao um subshell: variavel setada dentro do teste sobrevive.

DIR_TESTES=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
DIR_HOOKS=$(cd -- "$DIR_TESTES/../hooks" && pwd)
FALHAS_TESTE=${FALHAS_TESTE:-0}
REPOS_DESCARTAVEIS=()

contem_literal() {
  # Contencao LITERAL, sem caixa, de $2 dentro de $1. As aspas em torno de
  # "$trecho" dentro do padrao sao o que o torna literal: sem elas, * e ?
  # do trecho virariam curinga.
  local texto=${1,,}
  local trecho=${2,,}
  [[ $texto == *"$trecho"* ]]
}

assert_igual() {
  local esperado=$1 obtido=$2 titulo=$3
  if [[ $esperado == "$obtido" ]]; then
    printf '  ok    %s\n' "$titulo"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s\n' "$titulo"
    printf '          esperado: [%s]\n' "$esperado"
    printf '          obtido:   [%s]\n' "$obtido"
  fi
}

assert_contem() {
  local texto=$1 trecho=$2 titulo=$3
  if contem_literal "$texto" "$trecho"; then
    printf '  ok    %s\n' "$titulo"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s\n' "$titulo"
    printf '          nao contem: [%s]\n' "$trecho"
    printf '          no texto:   [%s]\n' "$texto"
  fi
}

assert_nao_contem() {
  local texto=$1 trecho=$2 titulo=$3
  if contem_literal "$texto" "$trecho"; then
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s\n' "$titulo"
    printf '          nao devia conter: [%s]\n' "$trecho"
    printf '          no texto:         [%s]\n' "$texto"
  else
    printf '  ok    %s\n' "$titulo"
  fi
}

criar_repo() {
  # Repositorio descartavel para um caso de teste. Ecoa o caminho.
  local raiz
  raiz=$(mktemp -d "${TMPDIR:-/tmp}/lotus-hooks-teste.XXXXXX")
  git -C "$raiz" init -q -b main
  git -C "$raiz" config user.email harness@lotus.local
  git -C "$raiz" config user.name 'Harness de teste'
  git -C "$raiz" commit -q --allow-empty -m base
  mkdir -p "$raiz/docs" "$raiz/backend" "$raiz/frontend" "$raiz/.claude/hooks"
  printf '%s\n' "$raiz"
}

registrar_descarte() { REPOS_DESCARTAVEIS+=("$1"); }

limpar_descartes() {
  local r
  for r in "${REPOS_DESCARTAVEIS[@]}"; do
    [[ -n $r && -d $r ]] && rm -rf "$r"
  done
  REPOS_DESCARTAVEIS=()
}

acionar_hook() {
  # $1 = caminho do hook, $2 = payload JSON. Seta SAIDA_HOOK e CODIGO_HOOK.
  local hook=$1 payload=$2
  SAIDA_HOOK=$(printf '%s' "$payload" | bash "$hook" 2>/dev/null)
  CODIGO_HOOK=$?
}

campo_json() {
  # $1 = texto (pode ser vazio), $2 = filtro jq. Ecoa vazio se nao for JSON.
  [[ -z $1 ]] && return 0
  printf '%s' "$1" | jq -r "$2 // \"\"" 2>/dev/null
}

payload_escrita() {
  # $1 = cwd, $2 = file_path, $3 = content (pode ser vazio)
  jq -nc --arg cwd "$1" --arg fp "$2" --arg ct "$3" \
    '{session_id:"teste", cwd:$cwd, tool_name:"Write",
      tool_input:({file_path:$fp} + (if $ct=="" then {} else {content:$ct} end))}'
}

payload_bash() {
  jq -nc --arg cwd "$1" --arg cmd "$2" \
    '{session_id:"teste", cwd:$cwd, tool_name:"Bash", tool_input:{command:$cmd}}'
}
