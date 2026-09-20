# Casca comum dos hooks. Aqui nao mora politica: so leitura de stdin,
# resolucao de raiz e emissao de JSON.

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
  git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null
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
