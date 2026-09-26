[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

escrever_plano() {
  # $1 = arvore, $2 = pasta; o resto sao as linhas do plano.
  local arv=$1 pasta=$2
  shift 2
  mkdir -p "$arv/docs/superpowers/blocos/$pasta"
  printf '%s\n' "$@" > "$arv/docs/superpowers/blocos/$pasta/plano.md"
}

_cm=$(criar_main_lane); registrar_descarte "$(dirname "$_cm")"
_c41=$(lane_manual "$_cm" feat/41-livre-a)
_c42=$(lane_manual "$_cm" feat/42-livre-b)
lane_manual "$_cm" feat/43-livre-c >/dev/null      # sem plano: pulada

escrever_plano "$_c41" 41-livre-a '# Plano 41' '**Files:**' \
  '- Create: `a.sh`' '- Modify: `b.py:10-20`' '- Test: `t/a.tests.sh`'
escrever_plano "$_c42" 42-livre-b '# Plano 42' '**Files:**' \
  '- Modify: `c.md`' '- Delete: `d.txt`' \
  'Texto corrido que cita `b.py` fora de uma linha de Files nao conta.'

rodar_lane "$_cm" conferir 41
assert_igual 0 "$CODIGO_LANE" 'planos disjuntos: sai 0'
assert_contem "$SAIDA_LANE" 'SEM CONFLITO: lane 41 contra 1 plano(s)' \
  'conta so os planos que existem (a 43 nao tem)'
assert_contem "$SAIDA_LANE" 'NAO CONFERIDA: lane 43 nao tem plano em' \
  'a lane sem plano sai nomeada, para o verde nao esconder o vazio'
assert_nao_contem "$SAIDA_LANE" 'NAO CONFERIDA: lane 42' 'a lane com plano nao sai como nao conferida'
rodar_lane "$_c42" conferir 41
assert_igual 0 "$CODIGO_LANE" 'conferir roda de dentro de outra lane (somente leitura)'

escrever_plano "$_c42" 42-livre-b '# Plano 42' '**Files:**' \
  '- Modify: `c.md`' '- Modify: `b.py:5`' '- Test: `t/a.tests.sh`'
rodar_lane "$_cm" conferir 41
assert_igual 1 "$CODIGO_LANE" 'arquivo em comum: sai 1'
assert_contem "$SAIDA_LANE" 'CONFLITO:' 'anuncia o conflito'
assert_contem "$SAIDA_LANE" '  b.py' 'o sufixo :linha nao esconde o arquivo em comum'
assert_contem "$SAIDA_LANE" '  t/a.tests.sh' 'nomeia todos os arquivos em comum'
assert_nao_contem "$SAIDA_LANE" 'c.md' 'nao nomeia arquivo de um lado so'

rodar_lane "$_cm" conferir 43
assert_recusa 'nao tem plano' 'a propria lane sem plano'
rodar_lane "$_cm" conferir 99
assert_recusa 'nenhuma lane viva' 'lane inexistente'
rodar_lane "$_cm" conferir
assert_recusa 'uso' 'sem NN'
