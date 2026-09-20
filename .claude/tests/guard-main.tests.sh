GUARD="$DIR_HOOKS/guard-main.sh"

decisao() { campo_json "$1" '.hookSpecificOutput.permissionDecision'; }
motivo()  { campo_json "$1" '.hookSpecificOutput.permissionDecisionReason'; }

_a=$(criar_repo); registrar_descarte "$_a"
_b=$(criar_repo); registrar_descarte "$_b"
git -C "$_b" checkout -q -b chore/outra

# --- na main, a allowlist decide
acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/backend/app/Models/X.php" '')"
assert_igual 0 "$CODIGO_HOOK" 'guard-main sai 0 mesmo negando'
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nega escrita em backend/ na main'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/docs/nota.md" '')"
assert_igual '' "$SAIDA_HOOK" 'libera docs/ na main'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/.claude/hooks/novo.sh" '')"
assert_igual '' "$SAIDA_HOOK" 'libera .claude/ na main'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/.agents/skills/x.md" '')"
assert_igual '' "$SAIDA_HOOK" 'libera .agents/ na main'

for _n in CLAUDE.md INSTRUÇÕES-DO-PROJETO.md CONTRIBUINDO.md AGENTS.md README.md; do
  acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/$_n" '')"
  assert_igual '' "$SAIDA_HOOK" "libera $_n na raiz da main"
done

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/docs-antigos/x.md" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'prefixo docs/ nao libera docs-antigos/'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/backend/CLAUDE.md" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nome liberado vale so na raiz'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "docs/relativo.md" '')"
assert_igual '' "$SAIDA_HOOK" 'caminho relativo resolve contra o cwd'

# --- fora da main, a allowlist nao se aplica
acionar_hook "$GUARD" "$(payload_escrita "$_b" "$_b/backend/app/Models/X.php" '')"
assert_igual '' "$SAIDA_HOOK" 'libera backend/ quando a branch nao e main'

# --- escrita cruzada: negada seja qual for a branch das duas
acionar_hook "$GUARD" "$(payload_escrita "$_b" "$_a/docs/nota.md" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nega escrita cruzada ainda que em docs/'
assert_contem "$(motivo "$SAIDA_HOOK")" 'outra arvore' 'o motivo da escrita cruzada diz o que e'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_b/frontend/src/x.ts" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nega escrita cruzada partindo da main'

# --- falha aberta
_fora=$(mktemp -d); registrar_descarte "$_fora"
acionar_hook "$GUARD" "$(payload_escrita "$_fora" "$_fora/x.txt" '')"
assert_igual '' "$SAIDA_HOOK" 'cwd fora de repositorio: falha aberta'
assert_igual 0 "$CODIGO_HOOK" 'cwd fora de repositorio sai 0'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_fora/rascunho.txt" '')"
assert_igual '' "$SAIDA_HOOK" 'alvo fora de qualquer repositorio: falha aberta'

acionar_hook "$GUARD" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao emite decisao'

# --- HEAD destacado nao desarma a allowlist
_c=$(criar_repo); registrar_descarte "$_c"
_c_commit1=$(git -C "$_c" rev-parse HEAD)
git -C "$_c" checkout -q --detach HEAD

acionar_hook "$GUARD" "$(payload_escrita "$_c" "$_c/backend/app/Models/X.php" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'HEAD destacado no commit da main nega escrita em backend/'

acionar_hook "$GUARD" "$(payload_escrita "$_c" "$_c/docs/nota.md" '')"
assert_igual '' "$SAIDA_HOOK" 'HEAD destacado no commit da main libera docs/'

git -C "$_c" checkout -q main
git -C "$_c" commit -q --allow-empty -m segundo
git -C "$_c" checkout -q --detach "$_c_commit1"
acionar_hook "$GUARD" "$(payload_escrita "$_c" "$_c/backend/app/Models/X.php" '')"
assert_igual '' "$SAIDA_HOOK" 'HEAD destacado num commit que main nao aponta mais libera backend/'
