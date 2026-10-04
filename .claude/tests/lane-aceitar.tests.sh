[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"
# shellcheck source=/dev/null
source "$DIR_HOOKS/lib/estados.sh"

# lane.sh aceitar (spec do bloco 36, 2.3): reabre numa lane curta o bloco
# que mesclou em blocked aguardando aceitacao.
_lap=33-harness-sinal-de-contexto-cheio

mesclado() {
  # $1 = main tree, $2 = pasta, $3 = branch gravada; $4.. linhas que trocam
  # as do frontmatter de mesmo campo ('workflow_state: closed'). Commita na
  # main o estado.md, a spec, o plano e a revisao de um bloco que mesclou em
  # blocked aguardando aceitacao.
  local main=$1 pasta=$2 br=$3 l
  shift 3
  local p="$main/docs/superpowers/blocos/$pasta"
  mkdir -p "$p"
  printf '# spec\n' > "$p/spec.md"
  printf '# plano\n' > "$p/plano.md"
  printf '# revisao\n\n## Em aberto\n' > "$p/revisao.md"
  cat > "$p/estado.md" <<ESTADO
---
schema_version: 3
id: ${pasta%%-*}
slug: $pasta
workflow_state: blocked
next_owner: joao
next_action: "resolve_blocker aguardando aceitação: itens 1"
resume_state: ready_for_closure
active_spec: docs/superpowers/blocos/$pasta/spec.md
active_plan: docs/superpowers/blocos/$pasta/plano.md
active_review: docs/superpowers/blocos/$pasta/revisao.md
active_acceptance: docs/superpowers/blocos/$pasta/aceitacao.md
context_packet: null
efeito_externo: sim
executor: claude
branch: $br
worktree: ../lotus-$pasta
offset: 1
lane_base: 1234abcd
commit: 5678ef90
blocker: "aguardando aceitação depois do merge: itens 1 da ## Verificação externa"
updated_at: 2026-10-04T10:00:00-03:00
updated_by: teste@host / sonnet
---

# Bloco ${pasta%%-*} — estado

Corpo de teste.
ESTADO
  for l in "$@"; do
    sed -i "s|^${l%%:*}:.*|$l|" "$p/estado.md"
  done
  git -C "$main" add "docs/superpowers/blocos/$pasta"
  git -C "$main" commit -q -m "mescla o bloco $pasta"
}

nada_criado_aceitar() {
  # $1 = main tree, $2 = titulo. Nem branch nova nem arvore.
  assert_igual '' "$(git -C "$1" branch --list "docs/$_lap" "chore/$_lap")" "$2: nenhuma branch criada"
  if [[ -e "$(dirname "$1")/lotus-$_lap" ]]; then
    FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA %s: a arvore foi criada\n' "$2"
  else
    printf '  ok    %s: nenhuma arvore criada\n' "$2"
  fi
}

# --- argumentos
_laa=$(criar_main_lane); registrar_descarte "$(dirname "$_laa")"
mesclado "$_laa" "$_lap" "chore/$_lap"
rodar_lane "$_laa" aceitar
assert_recusa 'uso' 'sem NN'
rodar_lane "$_laa" aceitar 33 --modelo
assert_recusa 'uso' '--modelo sem alias'
rodar_lane "$_laa" aceitar 33 --outra opus
assert_recusa 'uso' 'flag desconhecida'
rodar_lane "$_laa" aceitar 033
assert_recusa 'numero' 'NN com zero a esquerda'
rodar_lane "$_laa" aceitar 33 --modelo OPUS
assert_recusa 'alias' 'alias de modelo fora do padrao'
nada_criado_aceitar "$_laa" 'argumentos invalidos'

# --- 1. main tree, na main
_laL=$(lane_manual "$_laa" feat/41-livre-a)
rodar_lane "$_laL" aceitar 33
assert_recusa 'main tree' 'aceitar de dentro de uma lane'
git -C "$_laa" checkout -q -b outra
rodar_lane "$_laa" aceitar 33
assert_recusa 'na main' 'main tree fora da main'
git -C "$_laa" checkout -q main
nada_criado_aceitar "$_laa" 'recusa 1'

# --- 2. o estado.md, como a main o versiona
_la2=$(criar_main_lane); registrar_descarte "$(dirname "$_la2")"
rodar_lane "$_la2" aceitar 33
assert_recusa 'ha 0' 'bloco sem pasta'
mesclado "$_la2" "$_lap" "chore/$_lap" 'workflow_state: closed' 'resume_state: null' 'blocker: null'
rodar_lane "$_la2" aceitar 33
assert_recusa 'nao esta em blocked aguardando aceitacao' 'bloco ja closed'
mesclado "$_la2" "$_lap" "chore/$_lap" 'blocker: "credencial da AWS"'
rodar_lane "$_la2" aceitar 33
assert_recusa 'nao esta em blocked aguardando aceitacao' 'blocked por outro motivo'
mesclado "$_la2" "$_lap" "chore/$_lap" 'resume_state: executing'
rodar_lane "$_la2" aceitar 33
assert_recusa 'nao esta em blocked aguardando aceitacao' 'blocked com outro resume_state'
mesclado "$_la2" "$_lap" "chore/$_lap"
printf 'nota local\n' >> "$_la2/docs/superpowers/blocos/$_lap/estado.md"
rodar_lane "$_la2" aceitar 33
assert_recusa 'nao e o da main' 'estado.md com mudanca local no main tree'
nada_criado_aceitar "$_la2" 'recusa 2'

# --- 3. lane viva e branch sem worktree do mesmo numero
_la3=$(criar_main_lane); registrar_descarte "$(dirname "$_la3")"
mesclado "$_la3" "$_lap" "chore/$_lap"
lane_manual "$_la3" "infra/$_lap" >/dev/null
rodar_lane "$_la3" aceitar 33
assert_recusa 'ja tem lane viva' 'lane viva do mesmo numero'
_la3b=$(criar_main_lane); registrar_descarte "$(dirname "$_la3b")"
mesclado "$_la3b" "$_lap" "chore/$_lap"
git -C "$_la3b" branch -q "chore/$_lap"
rodar_lane "$_la3b" aceitar 33
assert_recusa 'sem worktree' 'branch do bloco sem worktree'
assert_contem "$SAIDA_LANE" 'modo conserto' 'sem worktree: aponta o modo conserto'

# --- 4. teto de tres lanes
_la4=$(criar_main_lane); registrar_descarte "$(dirname "$_la4")"
mesclado "$_la4" "$_lap" "chore/$_lap"
lane_manual "$_la4" feat/41-livre-a >/dev/null
lane_manual "$_la4" fix/42-livre-b >/dev/null
lane_manual "$_la4" infra/43-livre-c >/dev/null
rodar_lane "$_la4" aceitar 33
assert_recusa 'lanes vivas' 'quarta lane'
nada_criado_aceitar "$_la4" 'quarta lane'

# --- 6. caminho ja existe
_la6=$(criar_main_lane); registrar_descarte "$(dirname "$_la6")"
mesclado "$_la6" "$_lap" "chore/$_lap"
mkdir "$(dirname "$_la6")/lotus-$_lap"
rodar_lane "$_la6" aceitar 33
assert_recusa 'ja existe' 'o caminho da arvore ja existe'
assert_igual '' "$(git -C "$_la6" branch --list "docs/$_lap")" 'caminho ocupado: nenhuma branch criada'

# --- 7. offset: o .env de toda arvore conta
_la7=$(criar_main_lane); registrar_descarte "$(dirname "$_la7")"
mesclado "$_la7" "$_lap" "chore/$_lap"
printf 'LOTUS_DEV_HTTP_PORT=8081\n' > "$_la7/.env"
_la7a=$(lane_manual "$_la7" preview/a); printf 'LOTUS_DEV_HTTP_PORT=8082\n' > "$_la7a/.env"
_la7b=$(lane_manual "$_la7" preview/b); printf 'LOTUS_DEV_HTTP_PORT=8083\n' > "$_la7b/.env"
rodar_lane "$_la7" aceitar 33
assert_recusa 'offset livre' 'offsets 1 a 3 ocupados'
nada_criado_aceitar "$_la7" 'sem offset livre'

# --- caminho feliz: bloco da branch chore/ reabre em docs/
_lahm=$(criar_main_lane); registrar_descarte "$(dirname "$_lahm")"
mesclado "$_lahm" "$_lap" "chore/$_lap"
_labase=$(git -C "$_lahm" rev-parse --short main)
_lapnpm=$(criar_falso "$(dirname "$_lahm")" pnpm)
_laarv="$(dirname "$_lahm")/lotus-$_lap"
_laest="$_laarv/docs/superpowers/blocos/$_lap/estado.md"
FAKE_PNPM=$_lapnpm rodar_lane "$_lahm" aceitar 33 --modelo sonnet
assert_igual 0 "$CODIGO_LANE" 'aceitar feliz sai 0'
assert_contem "$SAIDA_LANE" "PORTAO OK: docs/$_lap pode abrir em $_laarv, offset +1" 'portao: branch docs/, arvore irma, offset +1'
assert_igual "LANE ABERTA: docs/$_lap em $_laarv" "$(printf '%s\n' "$SAIDA_LANE" | tail -n 1)" \
  'LANE ABERTA e a ultima linha'
assert_igual "docs/$_lap" "$(git -C "$_laarv" rev-parse --abbrev-ref HEAD)" 'a arvore esta na branch nova'
assert_igual '8081 / 3308 / 8026 / 9002 / 9003 / 5174' "$(portas_do_env "$_laarv/.env")" '.env da raiz com o offset +1'
assert_igual '' "$(cat "$_lapnpm.log")" 'pnpm nunca chamado'
if [[ ! -e $_laarv/backend/.env && ! -e $_laarv/frontend/.env ]]; then
  printf '  ok    backend/.env e frontend/.env nao sao copiados\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA a lane de aceitacao copiou .env de backend/ ou frontend/\n'
fi
assert_igual \
  "ready_for_closure${US}claude${US}close_active_work_item aceitacao externa${US}${US}${US}docs/$_lap${US}../lotus-$_lap${US}1${US}${_labase}${US}${_labase}${US}$(id -un)@$(hostname -s) / sonnet" \
  "$(python3 "$LER_FM_TESTE" "$_laest" workflow_state next_owner next_action resume_state blocker \
      branch worktree offset lane_base commit updated_by)" \
  'estado e campos da lane reescritos'
assert_igual \
  "3${US}33${US}${_lap}${US}docs/superpowers/blocos/$_lap/spec.md${US}docs/superpowers/blocos/$_lap/plano.md${US}docs/superpowers/blocos/$_lap/revisao.md${US}docs/superpowers/blocos/$_lap/aceitacao.md${US}${US}sim${US}claude" \
  "$(python3 "$LER_FM_TESTE" "$_laest" schema_version id slug active_spec active_plan active_review \
      active_acceptance context_packet efeito_externo executor)" \
  'os demais campos ficam'
if [[ $(python3 "$LER_FM_TESTE" "$_laest" updated_at) =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+[-+][0-9:]+$ ]]; then
  printf '  ok    updated_at em ISO-8601 com offset\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA updated_at em ISO-8601 com offset\n'
fi
assert_contem "$(cat "$_laest")" 'Corpo de teste.' 'o corpo antigo fica'
assert_contem "$(cat "$_laest")" "pelo lane.sh aceitar, na branch docs/$_lap; a branch do bloco era chore/$_lap." \
  'o corpo ganha a linha da reabertura'
assert_igual '' "$(coerencia_da_lane "$_laest" "docs/$_lap" "$_laarv")" 'a lane de aceitacao nasce coerente'
assert_igual 'chore(33): abre a lane de aceitação' "$(git -C "$_laarv" log -1 --format=%s)" \
  'a reabertura e commitada na branch nova'
assert_igual "docs/superpowers/blocos/$_lap/estado.md" "$(git -C "$_laarv" show --name-only --format= HEAD)" \
  'o commit leva so o estado.md'
assert_igual '' "$(git -C "$_laarv" status --porcelain)" 'a arvore da lane fica limpa'
assert_igual "$_labase" "$(git -C "$_lahm" rev-parse --short main)" 'a main nao anda'
assert_igual '' "$(git -C "$_lahm" status --porcelain)" 'o main tree fica limpo'

# --- descarte do PENDENTE (6a do finalizar-bloco): o conferir criou o
# aceitacao.md, que o bloco mesclado antes do item 36 nao versiona. O
# git restore nao o alcanca; o git clean -f -- sim, e o fechar --force passa.
_laac="docs/superpowers/blocos/$_lap/aceitacao.md"
printf '# 33 — Aceitação externa\n' > "$_laarv/$_laac"
git -C "$_laarv" restore -- "$_laac" 2>/dev/null
assert_igual 1 "$?" 'aceitacao.md nao versionado: o git restore sozinho falha'
git -C "$_laarv" clean -f -- "$_laac" >/dev/null
assert_igual '' "$(git -C "$_laarv" status --porcelain)" 'aceitacao.md nao versionado: o git clean -f -- limpa a arvore'
rodar_lane "$_lahm" fechar 33 --force
assert_igual 0 "$CODIGO_LANE" 'depois do descarte, o fechar 33 --force sai 0'

# --- o mesmo descarte com o aceitacao.md versionado: o git restore -- volta
# ao que a lane tinha.
_lavm=$(criar_main_lane); registrar_descarte "$(dirname "$_lavm")"
mesclado "$_lavm" "$_lap" "chore/$_lap"
printf '# 33 — Aceitação externa\n' > "$_lavm/$_laac"
git -C "$_lavm" add "$_laac"; git -C "$_lavm" commit -q -m 'aceitacao.md versionado'
rodar_lane "$_lavm" aceitar 33
_lavarv="$(dirname "$_lavm")/lotus-$_lap"
printf '| 1 | x | `nenhuma` | OK | 2026-10-04 |\n' >> "$_lavarv/$_laac"
git -C "$_lavarv" restore -- "$_laac"
assert_igual '' "$(git -C "$_lavarv" status --porcelain)" 'aceitacao.md versionado: o git restore -- limpa a arvore'
rodar_lane "$_lavm" fechar 33 --force
assert_igual 0 "$CODIGO_LANE" 'aceitacao.md versionado: depois do descarte, o fechar 33 --force sai 0'

# --- bloco cuja branch ja era docs/: reabre em chore/
_lacm=$(criar_main_lane); registrar_descarte "$(dirname "$_lacm")"
mesclado "$_lacm" "$_lap" "docs/$_lap"
rodar_lane "$_lacm" aceitar 33
assert_igual 0 "$CODIGO_LANE" 'branch docs/ no estado: aceitar sai 0'
assert_contem "$SAIDA_LANE" "LANE ABERTA: chore/$_lap em $(dirname "$_lacm")/lotus-$_lap" \
  'branch docs/ no estado: a lane nova e chore/'
assert_contem "$(python3 "$LER_FM_TESTE" "$(dirname "$_lacm")/lotus-$_lap/docs/superpowers/blocos/$_lap/estado.md" updated_by)" \
  '/ terminal' 'sem --modelo, updated_by diz terminal'

# --- lane viva que depende do bloco nao bloqueia: o portao de dependencia nao vale aqui
_ladm=$(criar_main_lane); registrar_descarte "$(dirname "$_ladm")"
mesclado "$_ladm" 31-harness-commands-de-bloco chore/31-harness-commands-de-bloco
lane_manual "$_ladm" chore/32-harness-aceitacao-externa >/dev/null
rodar_lane "$_ladm" aceitar 31
assert_igual 0 "$CODIGO_LANE" 'a lane viva 32 depende de 31, e o aceitar 31 passa'

# --- falha no meio: campo ausente no frontmatter nao vira lane incoerente calada
_lafm=$(criar_main_lane); registrar_descarte "$(dirname "$_lafm")"
mesclado "$_lafm" "$_lap" "chore/$_lap"
sed -i '/^lane_base:/d' "$_lafm/docs/superpowers/blocos/$_lap/estado.md"
git -C "$_lafm" commit -q -am 'estado sem lane_base'
rodar_lane "$_lafm" aceitar 33
assert_igual 1 "$CODIGO_LANE" 'estado sem lane_base: sai 1'
assert_contem "$SAIDA_LANE" 'LANE PELA METADE' 'estado sem lane_base: diz que ficou pela metade'
assert_contem "$SAIDA_LANE" "a branch docs/$_lap" 'nomeia a branch criada'
assert_contem "$SAIDA_LANE" 'lane.sh fechar 33' 'manda fechar'

# --- a recuperacao indicada funciona: o fechar passa depois da falha no meio
rodar_lane "$_lafm" fechar 33
assert_igual 0 "$CODIGO_LANE" 'depois da falha no meio, o fechar 33 sai 0'
if [[ -e $(dirname "$_lafm")/lotus-$_lap ]]; then
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA a arvore da lane pela metade continua no disco\n'
else
  printf '  ok    o fechar removeu a arvore da lane pela metade\n'
fi
if git -C "$_lafm" show-ref --verify --quiet "refs/heads/docs/$_lap"; then
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA a branch da lane pela metade continua\n'
else
  printf '  ok    o fechar removeu a branch da lane pela metade\n'
fi
