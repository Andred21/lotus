[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# Catraca do Q-1 do review do item 30: todo *.tests.sh recusa rodar avulso.
# Sourceado pelo run-all.sh, ele herda DIR_TESTES e os ajudantes do
# _assert.sh. Avulso (`bash x.tests.sh`), nada disso existe, os caminhos
# descartaveis saem vazios e o `git -C ""` cai no diretorio atual — em
# 2026-09-26 isso criou sete branches e uma worktree no repo real. A trava e
# a primeira linha de cada arquivo; esta catraca roda cada um avulso, de
# dentro de um repo descartavel e com TMPDIR descartavel, e exige a recusa.

for _av_f in "$DIR_TESTES"/*.tests.sh; do
  _av_n=$(basename "$_av_f")
  _av_r=$(criar_repo); registrar_descarte "$_av_r"
  _av_t=$(mktemp -d "${TMPDIR:-/tmp}/lotus-avulso.XXXXXX"); registrar_descarte "$_av_t"
  _av_saida=$(cd "$_av_r" && TMPDIR=$_av_t env -u DIR_TESTES -u DIR_HOOKS bash "$_av_f" 2>&1)
  _av_cod=$?
  assert_igual 1 "$_av_cod" "$_av_n avulso sai 1"
  assert_contem "$_av_saida" 'rode pelo run-all.sh' "$_av_n avulso recusa pela trava"
  assert_igual 'main' "$(git -C "$_av_r" for-each-ref --format='%(refname:short)' refs/heads/ | tr '\n' ' ' | sed 's/ $//')" \
    "$_av_n avulso nao cria branch"
done
