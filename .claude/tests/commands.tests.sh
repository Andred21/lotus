[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# Catraca do item 35 (spec compartilhada 5.8): os commands de bloco declaram
# modelo e esforco, invocam o caveman e cada Skill(superpowers:...) esperada;
# cada agente de papel declara modelo e esforco; papeis.md e .claude/agents/
# dizem a mesma coisa nos dois sentidos; nenhum ID fixo de modelo; o plugin
# do superpowers esta ligado; as skills aposentadas nao voltam.
# A checagem roda contra o .claude/ real e, antes, contra uma fixture valida
# estragada caso a caso: toda catraca e vista reprovar (licao 10).

_cm_ler="$DIR_HOOKS/lib/ler-frontmatter.py"
_CM_ALIAS=' opus sonnet haiku fable '
_CM_EFFORT=' low medium high xhigh max '

# command de bloco -> "model effort skills esperadas..."
declare -A _CM_BLOCO=(
  [planejar-bloco]='opus high superpowers:brainstorming superpowers:writing-plans superpowers:dispatching-parallel-agents'
  [executar-bloco]='sonnet medium superpowers:executing-plans superpowers:subagent-driven-development superpowers:test-driven-development'
  [revisar-bloco]='opus high superpowers:requesting-code-review superpowers:dispatching-parallel-agents superpowers:receiving-code-review'
  [finalizar-bloco]='sonnet high superpowers:verification-before-completion superpowers:finishing-a-development-branch'
)
# entradas que so precisam de model e effort validos (spec 5.7)
_CM_ENTRADAS=(commands/revisar-frontend.md commands/revisar-ui.md skills/auditar-docs/SKILL.md skills/lotus-ui-review/SKILL.md)
# Portoes do item 36 que o command roda como comando, porque em prosa o
# agente os executa de cabeca e pula (spec do bloco 36, 2.6). Cada entrada e
# 'command|trecho literal'; o trecho vai do primeiro | ate o fim.
_CM_TRECHOS=(
  'planejar-bloco|bash .claude/scripts/aceitacao.sh gerar'
  'finalizar-bloco|bash .claude/scripts/aceitacao.sh conferir'
  'finalizar-bloco|bash .claude/scripts/lane.sh aceitar'
  "finalizar-bloco|grep -E '^(deploy/|docker/Dockerfile\.prod|docker-compose\.prod|\.github/workflows/|scripts/)'"
)

cm_campos() { python3 "$_cm_ler" "$@"; }

cm_valida_escala() {
  # $1 = rotulo, $2 = model, $3 = effort
  [[ -n $2 && $_CM_ALIAS == *" $2 "* ]] || printf '%s: model [%s] fora dos aliases\n' "$1" "$2"
  [[ -n $3 && $_CM_EFFORT == *" $3 "* ]] || printf '%s: effort [%s] fora da escala\n' "$1" "$3"
}

cm_papeis_tabela() {
  # Linhas "| `nome` | papel | model | effort |" -> "nome model effort"
  [[ -f $1 ]] || return 0
  awk -F'|' '/^\| `/ {n=$2; m=$4; e=$5; gsub(/[` ]/, "", n); gsub(/ /, "", m); gsub(/ /, "", e); print n, m, e}' "$1" \
    | LC_ALL=C sort
}

cm_papeis_agentes() {
  local a m e
  for a in "$1"/*.md; do
    [[ -f $a ]] || continue
    IFS=$'\x1f' read -r m e < <(cm_campos "$a" model effort)
    printf '%s %s %s\n' "$(basename "$a" .md)" "$m" "$e"
  done | LC_ALL=C sort
}

cm_problemas() {
  # $1 = diretorio .claude (o que contem commands/, agents/, skills/...)
  local c=$1 nome arq s model effort dmi tab ag par
  local -a spec
  for nome in "${!_CM_BLOCO[@]}"; do
    arq="$c/commands/$nome.md"
    [[ -f $arq ]] || { printf '%s: command ausente\n' "$nome"; continue; }
    read -r -a spec <<<"${_CM_BLOCO[$nome]}"
    model='' effort='' dmi=''
    IFS=$'\x1f' read -r model effort dmi < <(cm_campos "$arq" model effort disable-model-invocation)
    [[ $model == "${spec[0]}" ]] || printf '%s: model [%s], esperado %s\n' "$nome" "$model" "${spec[0]}"
    [[ $effort == "${spec[1]}" ]] || printf '%s: effort [%s], esperado %s\n' "$nome" "$effort" "${spec[1]}"
    [[ $dmi == true ]] || printf '%s: sem disable-model-invocation: true\n' "$nome"
    grep -qF 'Skill(caveman, "ultra")' "$arq" || printf '%s: sem Skill(caveman, "ultra")\n' "$nome"
    for s in "${spec[@]:2}"; do
      grep -qF "Skill($s)" "$arq" || printf '%s: sem Skill(%s)\n' "$nome" "$s"
    done
  done
  for par in "${_CM_TRECHOS[@]}"; do
    arq="$c/commands/${par%%|*}.md"
    [[ -f $arq ]] || continue   # a ausencia ja saiu como "command ausente"
    grep -qF -- "${par#*|}" "$arq" || printf '%s: sem o trecho %s\n' "${par%%|*}" "${par#*|}"
  done
  for arq in "${_CM_ENTRADAS[@]}"; do
    [[ -f $c/$arq ]] || { printf '%s: entrada ausente\n' "$arq"; continue; }
    model='' effort=''
    IFS=$'\x1f' read -r model effort < <(cm_campos "$c/$arq" model effort)
    cm_valida_escala "$arq" "$model" "$effort"
  done
  for arq in "$c"/agents/*.md; do
    [[ -f $arq ]] || continue
    model='' effort=''
    IFS=$'\x1f' read -r model effort < <(cm_campos "$arq" model effort)
    cm_valida_escala "agents/$(basename "$arq")" "$model" "$effort"
  done
  [[ -f $c/papeis.md ]] || printf 'papeis.md ausente\n'
  tab=$(cm_papeis_tabela "$c/papeis.md")
  ag=$(cm_papeis_agentes "$c/agents")
  if [[ $tab != "$ag" ]]; then
    diff <(printf '%s\n' "$tab") <(printf '%s\n' "$ag") | grep '^[<>] .' \
      | sed 's/^< /papeis.md sem agente igual: /; s/^> /agente sem linha igual no papeis.md: /'
  fi
  grep -rlE 'claude-(opus|sonnet|haiku|fable)-[0-9]' "$c/commands" "$c/skills" "$c/agents" 2>/dev/null \
    | sed "s|^$c/|ID fixo de modelo em |"
  jq -e '.enabledPlugins["superpowers@claude-plugins-official"] == true' "$c/settings.json" >/dev/null 2>&1 \
    || printf 'settings.json sem o plugin superpowers@claude-plugins-official\n'
  for s in revisar-sprint fechar-sprint; do
    if [[ -e $c/skills/$s ]]; then printf 'skill aposentada ainda existe: %s\n' "$s"; fi
  done
  return 0
}

cm_fixture() {
  # Arvore .claude minima e valida, para as sondas estragarem.
  local c=$1 nome s arq par
  local -a spec
  mkdir -p "$c/commands" "$c/agents" "$c/skills/auditar-docs" "$c/skills/lotus-ui-review"
  for nome in "${!_CM_BLOCO[@]}"; do
    read -r -a spec <<<"${_CM_BLOCO[$nome]}"
    {
      printf -- '---\ndescription: x\nargument-hint: "[NN]"\ndisable-model-invocation: true\nmodel: %s\neffort: %s\n---\n\n' "${spec[0]}" "${spec[1]}"
      printf 'Invoque `Skill(caveman, "ultra")`.\n'
      for s in "${spec[@]:2}"; do printf 'Invoque `Skill(%s)`.\n' "$s"; done
      for par in "${_CM_TRECHOS[@]}"; do
        [[ ${par%%|*} == "$nome" ]] && printf '%s\n' "${par#*|}"
      done
    } > "$c/commands/$nome.md"
  done
  for arq in "${_CM_ENTRADAS[@]}"; do
    printf -- '---\ndescription: x\nmodel: sonnet\neffort: medium\n---\ncorpo\n' > "$c/$arq"
  done
  printf -- '---\nname: papel-x\ndescription: x\nmodel: sonnet\neffort: medium\n---\ncorpo\n' > "$c/agents/papel-x.md"
  printf '# Papeis\n\n| Agente | Papel | model | effort |\n|---|---|---|---|\n| `papel-x` | teste | sonnet | medium |\n' > "$c/papeis.md"
  printf '{"enabledPlugins":{"superpowers@claude-plugins-official":true}}\n' > "$c/settings.json"
}

_cm_t=$(mktemp -d "${TMPDIR:-/tmp}/lotus-commands.XXXXXX"); registrar_descarte "$_cm_t"
cm_fixture "$_cm_t/ok"
assert_igual '' "$(cm_problemas "$_cm_t/ok")" 'a fixture valida passa na catraca'

cm_sonda() {
  # $1 = caso, $2 = trecho esperado, $3.. = comando que estraga a copia (roda dentro dela)
  local caso=$1 trecho=$2 d
  shift 2
  d="$_cm_t/$caso"
  cp -r "$_cm_t/ok" "$d"
  (cd "$d" && "$@")
  assert_contem "$(cm_problemas "$d")" "$trecho" "a catraca reprova: $caso"
}

cm_sonda sem-brainstorming 'planejar-bloco: sem Skill(superpowers:brainstorming)' \
  sed -i '/Skill(superpowers:brainstorming)/d' commands/planejar-bloco.md
cm_sonda sem-tdd 'executar-bloco: sem Skill(superpowers:test-driven-development)' \
  sed -i '/Skill(superpowers:test-driven-development)/d' commands/executar-bloco.md
cm_sonda sem-model 'executar-bloco: model []' \
  sed -i '/^model:/d' commands/executar-bloco.md
cm_sonda model-trocado 'revisar-bloco: model [sonnet], esperado opus' \
  sed -i 's/^model: opus/model: sonnet/' commands/revisar-bloco.md
cm_sonda sem-effort 'finalizar-bloco: effort []' \
  sed -i '/^effort:/d' commands/finalizar-bloco.md
cm_sonda sem-dmi 'planejar-bloco: sem disable-model-invocation: true' \
  sed -i '/^disable-model-invocation:/d' commands/planejar-bloco.md
cm_sonda sem-caveman 'revisar-bloco: sem Skill(caveman, "ultra")' \
  sed -i '/Skill(caveman/d' commands/revisar-bloco.md
cm_sonda sem-command 'finalizar-bloco: command ausente' \
  rm commands/finalizar-bloco.md
cm_sonda entrada-sem-model 'commands/revisar-frontend.md: model [] fora dos aliases' \
  sed -i '/^model:/d' commands/revisar-frontend.md
cm_sonda agente-sem-effort 'agents/papel-x.md: effort [] fora da escala' \
  sed -i '/^effort:/d' agents/papel-x.md
cm_sonda papel-a-mais 'papeis.md sem agente igual: papel-y sonnet high' \
  sh -c 'printf "| \`papel-y\` | outro | sonnet | high |\n" >> papeis.md'
cm_sonda agente-a-mais 'agente sem linha igual no papeis.md: papel-z sonnet medium' \
  cp agents/papel-x.md agents/papel-z.md
cm_sonda effort-divergente 'agente sem linha igual no papeis.md: papel-x sonnet high' \
  sed -i 's/^effort: medium/effort: high/' agents/papel-x.md
cm_sonda id-fixo 'ID fixo de modelo em skills/auditar-docs/SKILL.md' \
  sed -i 's/^corpo$/use claude-sonnet-5-0/' skills/auditar-docs/SKILL.md
cm_sonda sem-plugin 'settings.json sem o plugin superpowers@claude-plugins-official' \
  sh -c 'printf "{}\n" > settings.json'
cm_sonda aposentada 'skill aposentada ainda existe: revisar-sprint' \
  mkdir -p skills/revisar-sprint
cm_sonda sem-gerar 'planejar-bloco: sem o trecho bash .claude/scripts/aceitacao.sh gerar' \
  sed -i '/aceitacao.sh gerar/d' commands/planejar-bloco.md
cm_sonda sem-conferir 'finalizar-bloco: sem o trecho bash .claude/scripts/aceitacao.sh conferir' \
  sed -i '/aceitacao.sh conferir/d' commands/finalizar-bloco.md
cm_sonda sem-aceitar 'finalizar-bloco: sem o trecho bash .claude/scripts/lane.sh aceitar' \
  sed -i '/lane.sh aceitar/d' commands/finalizar-bloco.md
cm_sonda sem-rede 'finalizar-bloco: sem o trecho grep -E' \
  sed -i '/docker-compose/d' commands/finalizar-bloco.md

# O .claude/ real.
assert_igual '' "$(cm_problemas "$DIR_TESTES/..")" 'o .claude/ real passa na catraca dos commands'
