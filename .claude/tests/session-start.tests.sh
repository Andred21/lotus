INICIO="$DIR_HOOKS/session-start.sh"

escrever_estado() {
  # $1 = raiz, $2 = workflow_state da lane-c, $3 = tree da lane-c
  mkdir -p "$1/docs/superpowers"
  cat > "$1/docs/superpowers/state.md" <<ESTADO
---
schema_version: 2
mode: multi-lane
lanes:
  lane-a:
    active_work_item: harness-hooks-de-guarda
    workflow_state: planning
    next_action: continue_active_planning
    tree: .
    branch: main
  lane-c:
    active_work_item: frontend-revisao-ui
    workflow_state: $2
    next_action: continue_active_plan
    tree: $3
    branch: refactor/frontend
---

# Estado
ESTADO
}

_p=$(criar_repo); registrar_descarte "$_p"
_c="${_p}-lane-c"
git -C "$_p" worktree add -q -b refactor/frontend "$_c" >/dev/null 2>&1
registrar_descarte "$_c"

escrever_estado "$_p" idle "../$(basename "$_c")"
escrever_estado "$_c" idle "../$(basename "$_c")"

acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_igual 0 "$CODIGO_HOOK" 'session-start sai 0'
assert_contem "$SAIDA_HOOK" 'lane-a' 'relata a lane-a'
assert_contem "$SAIDA_HOOK" 'lane-c' 'relata a lane-c'
assert_contem "$SAIDA_HOOK" 'refactor/frontend' 'relata a branch da outra lane'
assert_contem "$SAIDA_HOOK" '* lane-a' 'marca com * a lane desta sessao'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO VENCIDO' 'sem divergencia, sem alarme'
# Os tres alarmes precisam do sentido negativo. Um hook que gritasse sempre
# passaria nas asercoes de linha acima — e e exatamente o que o ARVORE ORFA faz
# no repositorio real hoje.
assert_nao_contem "$SAIDA_HOOK" 'ARVORE ORFA' 'toda arvore reclamada, sem alarme de orfa'
assert_nao_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' 'nenhuma lane fechando, sem alarme de fechamento'
assert_nao_contem "$SAIDA_HOOK" 'permissionDecision' 'SessionStart emite texto puro, nao JSON'

# --- o alarme que teria evitado o erro deste bloco
escrever_estado "$_c" executing "../$(basename "$_c")"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'ESTADO VENCIDO' 'acusa divergencia entre a main e a arvore da lane'
assert_contem "$SAIDA_HOOK" 'lane-c' 'a divergencia nomeia a lane'

# --- fechamento interrompido
escrever_estado "$_p" ready_for_closure '../arvore-que-nao-existe'
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' 'acusa lane em ready_for_closure sem arvore'

# --- arvore orfa
_orfa="${_p}-orfa"
git -C "$_p" worktree add -q -b chore/orfa "$_orfa" >/dev/null 2>&1
registrar_descarte "$_orfa"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'ARVORE ORFA' 'acusa arvore no disco que nenhuma lane reclama'
assert_contem "$SAIDA_HOOK" 'chore/orfa' 'a arvore orfa e nomeada pela branch'

# --- falha aberta
_forasess=$(mktemp -d); registrar_descarte "$_forasess"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_forasess" '{session_id:"teste", cwd:$cwd}')"
assert_igual '' "$SAIDA_HOOK" 'cwd fora de repositorio: nao relata nada'
acionar_hook "$INICIO" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao relata nada'

# --- campo vazio no meio da linha
# Regressao do separador: com TAB, `active_work_item` vazio COLAPSAVA e empurrava
# os campos seguintes uma casa para a esquerda, entao `tree` recebia o
# next_action, o diretorio nao existia e a comparacao de ESTADO VENCIDO daquela
# lane era pulada EM SILENCIO. O alarme ficava cego justo na lane divergente.
_vz=$(criar_repo); registrar_descarte "$_vz"
_vzc="${_vz}-lane-c"
git -C "$_vz" worktree add -q -b refactor/frontend "$_vzc" >/dev/null 2>&1
registrar_descarte "$_vzc"

escrever_estado_sem_item() {
  # $1 = raiz, $2 = workflow_state da lane-c. active_work_item fica VAZIO.
  mkdir -p "$1/docs/superpowers"
  cat > "$1/docs/superpowers/state.md" <<ESTADO
---
schema_version: 2
mode: multi-lane
lanes:
  lane-c:
    active_work_item:
    workflow_state: $2
    next_action: select_backlog_item
    tree: ../$(basename "$_vzc")
    branch: refactor/frontend
---

# Estado
ESTADO
}

escrever_estado_sem_item "$_vz" idle
escrever_estado_sem_item "$_vzc" executing
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_vz" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'ESTADO VENCIDO' 'item vazio nao cega a comparacao de estado'
# Entre parenteses de proposito: a branch aparece na saida mesmo com a linha
# deslocada (cai no lugar do item), entao procurar so pelo nome passaria com o
# bug de pe. A posicao e o que prova.
assert_contem "$SAIDA_HOOK" '(refactor/frontend)' 'item vazio nao desloca a branch da lane'
