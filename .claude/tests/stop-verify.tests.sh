PARADA="$DIR_HOOKS/stop-verify.sh"

payload_stop() {
  # $1 = cwd, $2 = session_id, $3 = stop_hook_active ("true"/"false")
  jq -nc --arg cwd "$1" --arg sid "$2" --argjson ativo "$3" \
    '{session_id:$sid, cwd:$cwd, stop_hook_active:$ativo, hook_event_name:"Stop"}'
}
limpar_marcas() { rm -f "${TMPDIR:-/tmp}"/lotus-stopverify-teste-*.marca; }

_v=$(criar_repo); registrar_descarte "$_v"
limpar_marcas

# --- arvore limpa nao cobra nada
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-limpo false)"
assert_igual '' "$SAIDA_HOOK" 'arvore limpa nao bloqueia'
assert_igual 0 "$CODIGO_HOOK" 'sai 0 com arvore limpa'

# --- backend
printf 'x\n' > "$_v/backend/Modelo.php"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-back false)"
assert_igual 'block' "$(campo_json "$SAIDA_HOOK" '.decision')" 'bloqueia com backend/ sujo'
assert_igual '' "$(campo_json "$SAIDA_HOOK" '.hookSpecificOutput')" 'Stop usa decision/reason na RAIZ, nao hookSpecificOutput'
_r=$(campo_json "$SAIDA_HOOK" '.reason')
assert_contem "$_r" 'php artisan test' 'cobra a suite do backend'
assert_contem "$_r" 'pint' 'cobra o pint'
assert_nao_contem "$_r" 'pnpm build' 'nao cobra o frontend quando o frontend nao mudou'

# --- o aviso nao repete para o mesmo commit
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-back false)"
assert_igual '' "$SAIDA_HOOK" 'a marca impede repetir o aviso para o mesmo commit'

# --- a marca e por sessao: outra sessao, mesmo commit, mesma arvore suja, avisa de novo
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-back-outra-sessao false)"
assert_igual 'block' "$(campo_json "$SAIDA_HOOK" '.decision')" 'sessao diferente com o mesmo commit ainda bloqueia'

# --- a marca e por commit: a mesma sessao avisa de novo quando o HEAD muda
# Estas sao as unicas linhas da suite que ESCREVEM num repo. Se $_v vier vazio,
# `git -C ""` cai no diretorio atual e o reset la embaixo apaga o WIP do Joao.
[[ -d $_v && -d $_v/.git ]] || { printf 'ABORTADO: repo descartavel invalido\n' >&2; exit 1; }
_head_base=$(git -C "$_v" rev-parse HEAD)
git -C "$_v" add -A
git -C "$_v" commit -q -m 'commita o backend sujo'
printf 'y\n' > "$_v/backend/Outro.php"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-back false)"
assert_igual 'block' "$(campo_json "$SAIDA_HOOK" '.decision')" 'mesma sessao com HEAD novo bloqueia de novo'

# --- desfaz o commit auxiliar: os testes seguintes assumem backend/ limpo de novo
git -C "$_v" reset -q --hard "$_head_base"
rm -f "$_v/backend/Outro.php"

# --- guarda primaria contra laco
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-laco true)"
assert_igual '' "$SAIDA_HOOK" 'stop_hook_active corta o laco imediato'

# --- frontend
rm -f "$_v/backend/Modelo.php"
printf 'x\n' > "$_v/frontend/tela.ts"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-front false)"
_r=$(campo_json "$SAIDA_HOOK" '.reason')
assert_contem "$_r" 'pnpm build' 'cobra o build do frontend'
assert_contem "$_r" 'pnpm test' 'cobra os testes do frontend'
assert_nao_contem "$_r" 'artisan' 'nao cobra o backend quando o backend nao mudou'

# --- .claude
rm -f "$_v/frontend/tela.ts"
printf 'x\n' > "$_v/.claude/hooks/novo.sh"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-claude false)"
_r=$(campo_json "$SAIDA_HOOK" '.reason')
assert_contem "$_r" 'run-all.sh' 'cobra a suite do harness'

# --- caminho fora dos tres vigiados nao cobra nada
rm -f "$_v/.claude/hooks/novo.sh"
printf 'x\n' > "$_v/docs/nota.md"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-docs false)"
assert_igual '' "$SAIDA_HOOK" 'docs/ nao esta entre os caminhos vigiados'

limpar_marcas
