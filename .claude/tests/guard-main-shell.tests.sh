GUARDSH="$DIR_HOOKS/guard-main-shell.sh"

decisao_sh() { campo_json "$1" '.hookSpecificOutput.permissionDecision'; }
motivo_sh()  { campo_json "$1" '.hookSpecificOutput.permissionDecisionReason'; }

_m=$(criar_repo); registrar_descarte "$_m"
_o=$(criar_repo); registrar_descarte "$_o"
git -C "$_o" checkout -q -b chore/bloco

# --- na main, o classificador decide
acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'ls -la docs')"
assert_igual '' "$SAIDA_HOOK" 'libera leitura na main'
assert_igual 0 "$CODIGO_HOOK" 'sai 0 ao liberar'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'rm -rf backend')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'nega rm na main'
assert_igual 0 "$CODIGO_HOOK" 'sai 0 ao negar — nunca exit 2'
assert_contem "$(motivo_sh "$SAIDA_HOOK")" 'classificar-comando.py' 'o motivo aponta a saida'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'pnpm lint -- --fix')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'nega a cauda depois de -- na main'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'pnpm lint')"
assert_igual '' "$SAIDA_HOOK" 'libera pnpm lint na main'

# --- fora da main, o classificador nem e chamado
acionar_hook "$GUARDSH" "$(payload_bash "$_o" 'rm -rf backend')"
assert_igual '' "$SAIDA_HOOK" 'nao guarda branch que nao e main'

# --- falha aberta por infraestrutura
_fora2=$(mktemp -d); registrar_descarte "$_fora2"
acionar_hook "$GUARDSH" "$(payload_bash "$_fora2" 'rm -rf /')"
assert_igual '' "$SAIDA_HOOK" 'sem raiz git: falha aberta'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" '')"
assert_igual '' "$SAIDA_HOOK" 'comando vazio nao decide nada'

# --- falha FECHADA por classificacao: o classificador some, o guarda nega
_quebrado=$(criar_repo); registrar_descarte "$_quebrado"
mkdir -p "$_quebrado/.claude/hooks/lib"
cp "$GUARDSH" "$_quebrado/.claude/hooks/"
cp "$DIR_HOOKS/lib/comum.sh" "$_quebrado/.claude/hooks/lib/"
acionar_hook "$_quebrado/.claude/hooks/guard-main-shell.sh" "$(payload_bash "$_quebrado" 'ls')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'classificador ausente: falha fechada'
assert_igual 0 "$CODIGO_HOOK" 'falha fechada tambem sai 0'
