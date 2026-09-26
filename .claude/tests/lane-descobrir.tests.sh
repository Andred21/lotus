# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

_dm=$(criar_main_lane); registrar_descarte "$(dirname "$_dm")"

rodar_lane "$_dm" descobrir
assert_igual 0 "$CODIGO_LANE" 'descobrir sai 0'
assert_igual '' "$SAIDA_LANE" 'so o main tree: nenhuma linha (o main tree nunca e lane)'

# --- cenario cheio
_d31=$(lane_manual "$_dm" chore/31-harness-commands-de-bloco)
escrever_estado_lane "$_d31" 31-harness-commands-de-bloco executing continue_active_plan \
  chore/31-harness-commands-de-bloco
_d41=$(lane_manual "$_dm" feat/41-livre-a)          # lane sem estado.md
_dorfa=$(lane_manual "$_dm" preview/client)         # fora do padrao
_ddet="$(dirname "$_dm")/lotus-destacada"
git -C "$_dm" worktree add -q --detach "$_ddet" main >/dev/null 2>&1
git -C "$_dm" branch -q fix/42-livre-b              # branch de lane sem worktree
git -C "$_dm" branch -q rascunho                    # branch comum sem worktree

rodar_lane "$_dm" descobrir
assert_igual 0 "$CODIGO_LANE" 'cenario cheio sai 0'
assert_igual \
  "lane${US}31${US}executing${US}chore/31-harness-commands-de-bloco${US}${_d31}${US}continue_active_plan${US}1" \
  "$(linha_com_prefixo "$SAIDA_LANE" "lane${US}31${US}")" \
  'lane: sete campos, lidos do estado.md na arvore da lane'
assert_igual "lane${US}41${US}${US}feat/41-livre-a${US}${_d41}${US}${US}" \
  "$(linha_com_prefixo "$SAIDA_LANE" "lane${US}41${US}")" \
  'lane sem estado.md: campos vazios, cada um no seu lugar'
assert_igual "orfa${US}${_dorfa}${US}preview/client" \
  "$(linha_com_prefixo "$SAIDA_LANE" "orfa${US}${_dorfa}${US}")" 'branch fora do padrao e orfa'
assert_igual "orfa${US}${_ddet}${US}(detached)" \
  "$(linha_com_prefixo "$SAIDA_LANE" "orfa${US}${_ddet}${US}")" 'worktree destacada e orfa'
assert_igual "sem-arvore${US}42${US}fix/42-livre-b" \
  "$(linha_com_prefixo "$SAIDA_LANE" "sem-arvore${US}")" 'branch de lane sem worktree'
assert_nao_contem "$SAIDA_LANE" 'rascunho' 'branch fora do padrao sem worktree nao e achado'
assert_igual 5 "$(printf '%s\n' "$SAIDA_LANE" | wc -l)" 'cinco achados, nem mais nem menos'

# --- de dentro de uma lane, o mesmo inventario
_dantes=$SAIDA_LANE
rodar_lane "$_d31" descobrir
assert_igual "$_dantes" "$SAIDA_LANE" 'descobrir de dentro da lane da o mesmo inventario'

# --- o main tree numa branch de lane continua fora
git -C "$_dm" checkout -q -b docs/43-livre-c
rodar_lane "$_dm" descobrir
assert_nao_contem "$SAIDA_LANE" 'docs/43-livre-c' 'o main tree nunca e lane nem sem-arvore'
git -C "$_dm" checkout -q main

# --- recusas
rodar_lane "$(dirname "$_dm")" descobrir
assert_igual 1 "$CODIGO_LANE" 'fora de repositorio sai 1'
assert_contem "$SAIDA_LANE" 'PORTAO RECUSOU' 'fora de repositorio recusa pelo portao'
rodar_lane "$_dm" descobrir extra
assert_contem "$SAIDA_LANE" 'uso: lane.sh descobrir' 'argumento a mais recusa'
rodar_lane "$_dm" apagar 31
assert_contem "$SAIDA_LANE" 'desconhecido' 'verbo desconhecido recusa'
