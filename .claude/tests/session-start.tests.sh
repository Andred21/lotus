INICIO="$DIR_HOOKS/session-start.sh"
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

ss_payload() { jq -nc --arg cwd "$1" '{session_id:"teste", cwd:$cwd, source:"startup"}'; }

_ssm=$(criar_main_lane); registrar_descarte "$(dirname "$_ssm")"

# --- so o main tree
acionar_hook "$INICIO" "$(ss_payload "$_ssm")"
assert_igual 0 "$CODIGO_HOOK" 'session-start sai 0'
assert_contem "$SAIDA_HOOK" 'Nenhuma lane viva' 'sem lane, diz que nao ha nenhuma'
assert_contem "$SAIDA_HOOK" 'Esta sessao nao esta numa lane' 'o main tree nao e lane'
# Os tres alarmes precisam do sentido negativo: um hook que gritasse sempre
# passaria em toda asercao de presenca.
assert_nao_contem "$SAIDA_HOOK" 'ARVORE ORFA' 'sem orfa, sem alarme de orfa'
assert_nao_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' 'sem branch solta, sem alarme de fechamento'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE' 'fora de lane, sem alarme de coerencia'
assert_nao_contem "$SAIDA_HOOK" 'permissionDecision' 'SessionStart emite texto puro, nao JSON'

# --- duas lanes; a sessao roda na 31
_ss31=$(lane_manual "$_ssm" chore/31-harness-commands-de-bloco)
mkdir -p "$_ss31/docs/superpowers/plans"; : > "$_ss31/docs/superpowers/plans/p31.md"
escrever_estado_lane "$_ss31" 31-harness-commands-de-bloco executing continue_active_plan \
  chore/31-harness-commands-de-bloco 'active_plan: docs/superpowers/plans/p31.md' 'efeito_externo: nao'
_ss41=$(lane_manual "$_ssm" feat/41-livre-a)
# A 41 esta incoerente de proposito (token de outro estado): o alarme dela e
# da sessao dela, nao desta.
escrever_estado_lane "$_ss41" 41-livre-a planning request_code_review feat/41-livre-a
sed -i 's/^offset: 1$/offset: null/' "$_ss41/docs/superpowers/blocos/41-livre-a/estado.md"

acionar_hook "$INICIO" "$(ss_payload "$_ss31")"
assert_contem "$SAIDA_HOOK" \
  "* 31 [executing] chore/31-harness-commands-de-bloco em $_ss31 (offset +1) -> continue_active_plan" \
  'a lane da sessao sai com * e os campos do estado.md dela'
assert_contem "$SAIDA_HOOK" "  41 [planning] feat/41-livre-a em $_ss41 (sem offset) -> request_code_review" \
  'a outra lane sai sem *, e offset null vira sem offset'
assert_contem "$SAIDA_HOOK" 'Esta sessao e a lane 31' 'a saida diz qual e a lane da sessao'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE' 'incoerencia de OUTRA lane nao e alarme desta sessao'

# --- a mesma classe de incoerencia, agora na lane da sessao
escrever_estado_lane "$_ss31" 31-harness-commands-de-bloco executing request_code_review \
  chore/31-harness-commands-de-bloco 'active_plan: docs/superpowers/plans/p31.md' 'efeito_externo: nao'
acionar_hook "$INICIO" "$(ss_payload "$_ss31")"
assert_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE — lane 31' 'acusa a incoerencia da lane da sessao'
assert_contem "$SAIDA_HOOK" 'next_action' 'nomeia o campo incoerente'

# --- do main tree ninguem ganha *
acionar_hook "$INICIO" "$(ss_payload "$_ssm")"
assert_nao_contem "$SAIDA_HOOK" '* 31' 'do main tree, a 31 nao ganha *'
assert_nao_contem "$SAIDA_HOOK" '* 41' 'do main tree, a 41 nao ganha *'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE' 'do main tree, nenhuma lane e conferida'

# --- orfa e fechamento interrompido
_ssorfa=$(lane_manual "$_ssm" preview/client)
git -C "$_ssm" branch -q fix/42-livre-b
acionar_hook "$INICIO" "$(ss_payload "$_ssm")"
assert_contem "$SAIDA_HOOK" 'ARVORE ORFA' 'acusa worktree fora do padrao'
assert_contem "$SAIDA_HOOK" "$_ssorfa em preview/client" 'a orfa e nomeada pela arvore e pela branch'
assert_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' 'acusa branch de lane sem worktree'
assert_contem "$SAIDA_HOOK" '42: a branch fix/42-livre-b' 'nomeia o numero e a branch'

# --- falha aberta
_ssfora=$(mktemp -d); registrar_descarte "$_ssfora"
acionar_hook "$INICIO" "$(ss_payload "$_ssfora")"
assert_igual '' "$SAIDA_HOOK" 'cwd fora de repositorio: nao relata nada'
acionar_hook "$INICIO" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao relata nada'
