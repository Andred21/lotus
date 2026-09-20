# Casca comum dos hooks. Aqui nao mora politica: so leitura de stdin,
# resolucao de raiz e emissao de JSON.

# O fail-open e o contrato e fica: sem jq, os guards saem 0 e ficam mudos.
# Mas mudo e diferente de sem rastro — sem isso, "jq ausente" e
# indistinguivel de um "libera" deliberado. Nao muda exit code nem stdout.
command -v jq >/dev/null 2>&1 || printf 'harness: jq ausente, guards desativados\n' >&2

ler_payload() { PAYLOAD=$(cat); }

campo() {
  # $1 = filtro jq. Ecoa vazio quando o payload nao e JSON ou o campo falta.
  [[ -z ${PAYLOAD:-} ]] && return 0
  printf '%s' "$PAYLOAD" | jq -r "$1 // empty" 2>/dev/null
}

raiz_de() {
  # A raiz vem SEMPRE do git, nunca de CLAUDE_PROJECT_DIR: no Lotus as
  # arvores de trabalho sao diretorios IRMAOS (../lotus-infra,
  # ../fix-frontend), entao a variavel aponta para FORA da arvore da sessao,
  # e nao para uma pasta acima dela.
  [[ -d ${1:-} ]] || return 0
  git -C "$1" rev-parse --show-toplevel 2>/dev/null
}

branch_de() {
  [[ -d ${1:-} ]] || return 0
  local branch ref
  branch=$(git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [[ $branch == HEAD ]]; then
    # HEAD destacado: --abbrev-ref devolve a string literal "HEAD", o que
    # esconde de quem chama que o commit atual pode ser exatamente o de
    # main (bisect, checkout de sha, rebase em andamento). Resolve pelas
    # refs que apontam para o commit atual, e casa "main" exatamente,
    # linha a linha, para "main-antiga" nao colar por substring.
    while IFS= read -r ref; do
      if [[ $ref == main ]]; then
        branch=main
        break
      fi
    done < <(git -C "$1" branch --points-at HEAD --format='%(refname:short)' 2>/dev/null)
  fi
  printf '%s' "$branch"
}

negar_pretooluse() {
  # Toda emissao passa por `jq -n --arg`: os motivos citam caminhos, e um
  # deles e INSTRUÇÕES-DO-PROJETO.md.
  jq -n --arg motivo "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",
                          permissionDecision:"deny",
                          permissionDecisionReason:$motivo}}'
}

bloquear_stop() {
  # O evento Stop usa decision/reason na RAIZ do JSON — formato diferente do
  # hookSpecificOutput do PreToolUse.
  jq -n --arg motivo "$1" '{decision:"block", reason:$motivo}'
}
