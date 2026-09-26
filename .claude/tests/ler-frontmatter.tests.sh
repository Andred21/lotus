LER_FM="$DIR_HOOKS/lib/ler-frontmatter.py"
_lfus=$'\x1f'

_lf=$(mktemp -d "${TMPDIR:-/tmp}/lotus-ler-fm.XXXXXX"); registrar_descarte "$_lf"
cat > "$_lf/estado.md" <<'MD'
---
schema_version: 3
id: 30
workflow_state: planning
next_action: "close_active_work_item PR #120 aberto"
sem_aspas: close_active_work_item PR #120 aberto
active_plan: null
resume_state: ~
branch: chore/30-harness-estado-por-bloco
offset: 1
efeito_externo: nao
updated_at: 2026-09-26T05:10:00-03:00
lista: [a, b]
vazio:
bloco: |
  linha um
  linha dois
---

# Corpo

---

workflow_state: nao-e-frontmatter
MD

lf() { python3 "$LER_FM" "$@"; }

assert_igual "planning${_lfus}chore/30-harness-estado-por-bloco" \
  "$(lf "$_lf/estado.md" workflow_state branch)" 'emite os campos pedidos, separados por US'
assert_igual "chore/30-harness-estado-por-bloco${_lfus}planning" \
  "$(lf "$_lf/estado.md" branch workflow_state)" 'a ordem e a do pedido, nao a do arquivo'
assert_igual "${_lfus}${_lfus}planning" \
  "$(lf "$_lf/estado.md" active_plan resume_state workflow_state)" \
  'null e ~ viram vazio sem deslocar o campo seguinte'
assert_igual "${_lfus}planning" "$(lf "$_lf/estado.md" nao_existe workflow_state)" \
  'campo ausente vira vazio'
assert_igual "2026-09-26T05:10:00-03:00${_lfus}1${_lfus}nao${_lfus}30" \
  "$(lf "$_lf/estado.md" updated_at offset efeito_externo id)" \
  'escalares saem como escritos: timestamp, inteiro e nao'
assert_igual 'close_active_work_item PR #120 aberto' "$(lf "$_lf/estado.md" next_action)" \
  'texto livre entre aspas sai inteiro, com o #'
# O YAML trata " #" como comentario: sem aspas, o resto da linha some. O
# contrato do state.md manda aspas por causa disto.
assert_igual 'close_active_work_item PR' "$(lf "$_lf/estado.md" sem_aspas)" \
  'sem aspas, o # vira comentario (documenta a armadilha)'
assert_igual "$_lfus" "$(lf "$_lf/estado.md" lista vazio)" 'lista e valor vazio viram vazio'
assert_igual 'linha um linha dois' "$(lf "$_lf/estado.md" bloco)" \
  'valor de varias linhas sai numa linha so'
assert_igual 'planning' "$(lf "$_lf/estado.md" workflow_state)" \
  'o frontmatter termina no primeiro --- (o corpo nao vaza)'

assert_igual '' "$(lf "$_lf/nao-existe.md" workflow_state)" 'arquivo ausente: nada'
printf '# sem frontmatter\nworkflow_state: x\n' > "$_lf/sem.md"
assert_igual '' "$(lf "$_lf/sem.md" workflow_state)" 'sem frontmatter: nada'
printf -- '---\nchave: [aberta\n---\n' > "$_lf/ruim.md"
assert_igual '' "$(lf "$_lf/ruim.md" chave)" 'YAML invalido: nada'
lf "$_lf/ruim.md" chave >/dev/null 2>&1
assert_igual 0 "$?" 'YAML invalido sai 0'
printf -- '---\n- a\n- b\n---\n' > "$_lf/lista.md"
assert_igual '' "$(lf "$_lf/lista.md" a)" 'frontmatter que nao e mapa: nada'
