# Prova o proprio arcabouco. O bug que o harness original apanhou mora aqui:
# contencao tratada como glob faz a crase virar escape, e nenhum trecho com
# crase casa por mais que o texto o contenha.

contem_literal 'use `git -C` para trocar de diretorio' '`git -C`'
assert_igual 0 $? 'contem_literal acha trecho com crase'

contem_literal 'TEXTO EM CAIXA ALTA' 'texto em caixa'
assert_igual 0 $? 'contem_literal ignora caixa'

contem_literal 'abc' 'xyz'
assert_igual 1 $? 'contem_literal nega o que nao esta la'

contem_literal 'literal com * asterisco' 'com * asterisco'
assert_igual 0 $? 'contem_literal trata asterisco como literal'

contem_literal 'texto sem curinga' 'texto*curinga'
assert_igual 1 $? 'contem_literal nao interpreta glob'

_repo=$(criar_repo); registrar_descarte "$_repo"
assert_igual 'main' "$(git -C "$_repo" rev-parse --abbrev-ref HEAD)" 'criar_repo nasce na branch main'
assert_igual '' "$(git -C "$_repo" status --porcelain)" 'criar_repo nasce limpo'
assert_igual "$_repo" "$(git -C "$_repo" rev-parse --show-toplevel)" 'criar_repo e a raiz do proprio repositorio'
