[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# shellcheck source=/dev/null
source "$DIR_HOOKS/lib/estados.sh"
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

_co=$(mktemp -d "${TMPDIR:-/tmp}/lotus-coerencia.XXXXXX"); registrar_descarte "$_co"
mkdir -p "$_co/docs/superpowers/plans" "$_co/docs/superpowers/blocos/31-x"
: > "$_co/docs/superpowers/plans/p.md"
: > "$_co/docs/superpowers/blocos/31-x/revisao.md"
_coe="$_co/docs/superpowers/blocos/31-x/estado.md"
_coplano='active_plan: docs/superpowers/plans/p.md'
_corev='active_review: docs/superpowers/blocos/31-x/revisao.md'

co_estado() {
  local ws=$1 na=$2
  shift 2
  escrever_estado_lane "$_co" 31-x "$ws" "$na" chore/31-x "$@"
}
co() { coerencia_da_lane "$_coe" chore/31-x "$_co"; }

# --- o mapa
assert_igual 12 "${#TOKEN_DO_ESTADO[@]}" 'doze estados no mapa'
assert_igual 11 "${#ORDEM_DE_FASE[@]}" 'onze fases na regua (blocked fica fora)'
assert_igual close_active_work_item "${TOKEN_DO_ESTADO[ready_for_closure]}" 'token de ready_for_closure'
assert_igual -1 "$(posicao_de_fase blocked)" 'blocked nao tem posicao propria'

# --- coerente
co_estado planning continue_active_planning
assert_igual '' "$(co)" 'planning sem plano e coerente'
co_estado executing continue_active_plan "$_coplano" 'efeito_externo: nao'
assert_igual '' "$(co)" 'executing com plano e efeito_externo e coerente'
co_estado ready_for_closure '"close_active_work_item PR #120 aberto"' "$_coplano" "$_corev" 'efeito_externo: sim'
assert_igual '' "$(co)" 'texto livre depois do token e coerente'
co_estado blocked 'resolve_blocker esperando o Joao' 'resume_state: planning'
assert_igual '' "$(co)" 'blocked vindo de planning nao exige plano'

# --- incoerente
co_estado executing request_code_review "$_coplano" 'efeito_externo: nao'
assert_contem "$(co)" 'next_action' 'token de outro estado'
co_estado executing continue_active_plan_x "$_coplano" 'efeito_externo: nao'
assert_contem "$(co)" 'next_action' 'token com sufixo colado nao e o token'
co_estado inventado continue_active_plan
assert_contem "$(co)" 'workflow_state desconhecido' 'estado fora da tabela'
co_estado planning continue_active_planning
assert_contem "$(coerencia_da_lane "$_coe" chore/31-outra "$_co")" 'branch' 'branch do estado diverge do git'
co_estado ready_for_execution execute_active_plan 'efeito_externo: nao'
assert_contem "$(co)" 'active_plan' 'plano ausente a partir de ready_for_execution'
co_estado ready_for_execution execute_active_plan 'active_plan: docs/nao/existe.md' 'efeito_externo: nao'
assert_contem "$(co)" 'nao existe' 'plano apontando para arquivo inexistente'
co_estado executing continue_active_plan "$_coplano" 'efeito_externo: null'
assert_contem "$(co)" 'efeito_externo' 'efeito_externo null a partir de ready_for_execution'
co_estado executing continue_active_plan "$_coplano"
assert_contem "$(co)" 'efeito_externo' 'efeito_externo ausente conta como null'
co_estado executing continue_active_plan "$_coplano" 'efeito_externo: talvez'
assert_contem "$(co)" 'efeito_externo' 'efeito_externo fora de sim ou nao'
co_estado ready_for_closure close_active_work_item "$_coplano" 'efeito_externo: nao'
assert_contem "$(co)" 'active_review' 'review ausente a partir de ready_for_closure'
co_estado ready_for_closure close_active_work_item "$_coplano" 'active_review: docs/nao/existe.md' 'efeito_externo: nao'
assert_contem "$(co)" 'active_review aponta para docs/nao/existe.md' 'review apontando para arquivo inexistente'
co_estado blocked resolve_blocker 'efeito_externo: nao'
assert_contem "$(co)" 'resume_state' 'blocked sem resume_state'
co_estado blocked resolve_blocker 'resume_state: executing' 'efeito_externo: nao'
assert_contem "$(co)" 'active_plan' 'blocked vindo de executing: a regua e o resume_state'
rm -f "$_coe"
assert_contem "$(co)" 'sem estado.md' 'estado.md ausente'

# --- catraca: a tabela "Estados validos" do state.md espelha o mapa, nos
# dois sentidos (licao 19)
_ctr="$DIR_TESTES/../../docs/superpowers/state.md"

tabela_do_contrato() {
  awk '/^## Estados válidos/ {dentro=1; next} /^## / {dentro=0} dentro && /^\| `/' "$1" \
    | awk -F'|' '{e=$2; t=$3; gsub(/[` ]/, "", e); gsub(/[` ]/, "", t); print e, t}' \
    | LC_ALL=C sort
}
mapa_do_codigo() {
  local e
  for e in "${!TOKEN_DO_ESTADO[@]}"; do
    printf '%s %s\n' "$e" "${TOKEN_DO_ESTADO[$e]}"
  done | LC_ALL=C sort
}

assert_igual "$(mapa_do_codigo)" "$(tabela_do_contrato "$_ctr")" 'a tabela do state.md espelha estados.sh'
assert_igual 12 "$(tabela_do_contrato "$_ctr" | wc -l)" 'a tabela do state.md tem os doze estados'

# O comparador tem de conseguir reprovar (licao 10). Copia estragada nao faz
# o teste passar: se o sed nao mudar nada, a comparacao fica igual e reprova.
_ctrs=$(mktemp -d "${TMPDIR:-/tmp}/lotus-contrato.XXXXXX"); registrar_descarte "$_ctrs"
sed '/^| `closed`/d' "$_ctr" > "$_ctrs/falta.md"
sed 's/^| `closed` | `none`/| `closed` | `nada`/' "$_ctr" > "$_ctrs/token.md"
sed '/^| `blocked`/a | `zumbi` | `x` | nada |' "$_ctr" > "$_ctrs/sobra.md"
for _ctrc in falta token sobra; do
  if [[ "$(mapa_do_codigo)" != "$(tabela_do_contrato "$_ctrs/$_ctrc.md")" ]]; then
    printf '  ok    a catraca reprova a tabela com estado %s\n' "$_ctrc"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA a catraca nao viu a tabela com estado %s\n' "$_ctrc"
  fi
done
