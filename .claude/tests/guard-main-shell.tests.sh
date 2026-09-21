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

# --- fix final de review (fix 1): os escapes fim a fim, pelo
# guarda, e nao so pelo classificador — foi assim que o review os reproduziu.
for _escape in 'git push --forc\e origin main' \
               'find . -name x -exe\c rm {} ;' \
               'sed --in-plac\e s/a/b/ README.md' \
               'git branch --delet\e antiga' \
               'git worktree remov\e ../outra'; do
  acionar_hook "$GUARDSH" "$(payload_bash "$_m" "$_escape")"
  assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" "nega na main, fim a fim: $_escape"
done

# O outro lado, pelo mesmo caminho: o vizinho legitimo continua passando.
for _ok in 'grep -rn "padrao\.txt" backend/app' \
           'cat "arquivo com espaco.txt"' \
           'sed -n "1,20p" README.md'; do
  acionar_hook "$GUARDSH" "$(payload_bash "$_m" "$_ok")"
  assert_igual '' "$SAIDA_HOOK" "libera na main, fim a fim: $_ok"
done
