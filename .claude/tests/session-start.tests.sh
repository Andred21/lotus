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

# --- Q-3: mesmo item com o estado adiantado na arvore e o ciclo normal, nao
# divergencia. A main so e reescrita em fronteira duravel — o proprio hook diz
# isso duas linhas acima do alarme —, entao gritar aqui acusava TODA lane em
# trabalho (3 de 3 na sessao que achou isto) e treinava o leitor a ignorar.
_q3=$(criar_repo); registrar_descarte "$_q3"
_q3c="${_q3}-lane-c"
git -C "$_q3" worktree add -q -b refactor/frontend "$_q3c" >/dev/null 2>&1
registrar_descarte "$_q3c"

escrever_estado "$_q3"  ready_for_execution "../$(basename "$_q3c")"
escrever_estado "$_q3c" reviewing           "../$(basename "$_q3c")"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_q3" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_nao_contem "$SAIDA_HOOK" 'ESTADO VENCIDO' \
                  'mesmo item com estado adiantado na arvore nao e alarme'
assert_contem "$SAIDA_HOOK" 'lane-c [reviewing]' \
              'a lane aparece com o estado da arvore, que e quem manda'
assert_contem "$SAIDA_HOOK" 'Estado entre colchetes lido da arvore' \
              'a saida diz de onde veio o estado exibido'

# O sentido negativo: item diferente continua sendo alarme, e a main dizendo
# idle enquanto a arvore trabalha tambem — foi esse o caso que custou duas
# paradas no planejamento deste bloco.
escrever_estado "$_q3c" reviewing "../$(basename "$_q3c")"
sed -i 's/^    active_work_item: frontend-revisao-ui$/    active_work_item: outro-item/' \
    "$_q3c/docs/superpowers/state.md"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_q3" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'ESTADO VENCIDO' 'item diferente continua sendo alarme'

# --- Q-4: a lane reclama a arvore pelo `tree`, nao pela `branch`. A branch
# registrada envelhece assim que a outra sessao troca de branch; no repositorio
# real isso dava 3 orfas falsas em 4 arvores.
_q4=$(criar_repo); registrar_descarte "$_q4"
_q4c="${_q4}-lane-c"
git -C "$_q4" worktree add -q -b refactor/frontend "$_q4c" >/dev/null 2>&1
registrar_descarte "$_q4c"
escrever_estado "$_q4"  idle "../$(basename "$_q4c")"
escrever_estado "$_q4c" idle "../$(basename "$_q4c")"
# A outra sessao troca de branch: o campo `branch` da lane fica velho.
git -C "$_q4c" checkout -q -b refactor/frontend-v2

acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_q4" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_nao_contem "$SAIDA_HOOK" 'ARVORE ORFA' \
                  'branch trocada nao transforma a arvore da lane em orfa'
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_q4c" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" '* lane-c' \
              'a sessao acha a propria lane mesmo com a branch trocada'

# --- Q-5: `main-tree` e o sentinela que as skills usam para o repositorio
# principal. Sem traduzi-lo o caminho virava "$principal/main-tree", que nao
# existe: a comparacao de estado sumia em silencio e ready_for_closure virava
# um FECHAMENTO INTERROMPIDO falso.
_q5=$(criar_repo); registrar_descarte "$_q5"
escrever_estado "$_q5" ready_for_closure 'main-tree'
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_q5" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_nao_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' \
                  'main-tree resolve para o repositorio principal, que existe'
assert_contem "$SAIDA_HOOK" 'lane-c [ready_for_closure]' 'a lane em main-tree e relatada'
# O sentido negativo: arvore que de fato nao existe continua acusando.
escrever_estado "$_q5" ready_for_closure '../arvore-que-nao-existe'
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_q5" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' \
              'arvore inexistente de verdade continua acusando'
