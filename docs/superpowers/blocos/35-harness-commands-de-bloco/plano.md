# Bloco 35 — `harness-commands-de-bloco` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** os quatro commands de bloco (`/planejar-bloco`, `/executar-bloco`, `/revisar-bloco`,
`/finalizar-bloco`) no desenho do ElaDecora, em bash, com cada etapa invocando a skill do
superpowers por `Skill()` explícito e modelo e esforço declarados por fase e por papel, presos por
uma catraca.

**Architecture:** commands são prompts em `.claude/commands/`, com `model` e `effort` no
frontmatter. Os papéis despachados viram agentes em `.claude/agents/`, porque só o frontmatter de um
agente aplica esforço; a tabela única deles é `.claude/papeis.md`. A revisão tem duas lentes:
`revisor-bloco` com `.claude/prompts/gabarito-lotus.md`, depois um `verificador-achado` por achado,
com `.claude/prompts/verificador-achado.md`. A catraca `.claude/tests/commands.tests.sh` reprova a
regressão de qualquer um desses contratos.

**Tech Stack:** Markdown com frontmatter YAML (Claude Code), bash 5, python3 +
PyYAML (`ler-frontmatter.py`, já no repo), `jq`, a suíte `.claude/tests/run-all.sh`.

**Fontes:** [`spec.md`](./spec.md) (emendas E1–E8) sobre a §5 de
[`specs/2026-09-26-harness-paridade-eladecora-design.md`](../../specs/2026-09-26-harness-paridade-eladecora-design.md).

## Global Constraints

- **Modelo por alias, nunca por ID.** Valores de `model`: `opus`, `sonnet`, `haiku`, `fable`.
  Nenhum `claude-…` em command, skill ou agente.
- **`effort`** ∈ `low`, `medium`, `high`, `xhigh`, `max`.
- **Frontmatter dos quatro commands de bloco:** `description`, `argument-hint`,
  `disable-model-invocation: true`, `model`, `effort`, nesta ordem. Sem `shell:`; sem
  `allowed-tools`.
  - `planejar-bloco`: `opus` / `high`.
  - `executar-bloco`: `sonnet` / `medium`.
  - `revisar-bloco`: `opus` / `high`.
  - `finalizar-bloco`: `sonnet` / `high`.
- **Skill citada por linha literal** `Skill(superpowers:<skill>)`, com o nome qualificado. O caveman
  é `Skill(caveman, "ultra")`. A catraca casa esses literais byte a byte.
- **Preâmbulo comum.** Todo command de bloco abre com a seção abaixo, verbatim:

  ```markdown
  ## Regra de invocação de skill — leia antes de tudo

  Toda skill citada abaixo é invocada pela ferramenta `Skill`, e a invocação é confirmada antes
  do passo seguinte. **Nunca execute o processo de uma skill de cabeça.**

  Se você pensar *"eu já conheço essa skill"* ou *"o conteúdo dela já está no meu contexto"*,
  esse é o sinal de que o erro está prestes a acontecer — não uma dispensa. Este modo de falha
  já se repetiu neste projeto: o agente lê "use a skill Y", reconhece o processo, e executa uma
  versão de cabeça, pulando exatamente os gates que justificam a skill.
  ```

- **Estado.** Estados e tokens são os da tabela de `docs/superpowers/state.md`. A primeira palavra
  do `next_action` é o token do estado; texto livre pode vir depois de um espaço, e texto com `#`
  vai entre aspas. `next_owner` ∈ `joao`, `claude`, `codex`. Toda escrita no `estado.md` atualiza
  três campos:
  - `commit` = `git rev-parse --short HEAD` **antes** do commit;
  - `updated_at` = `date -Iseconds`;
  - `updated_by` = `<id -un>@<hostname -s> / <alias do modelo da sessão>`.

  O estado muda só no commit do artefato que prova a transição (invariante 6).
- **Lane.** A branch casa `^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$`. A pasta do
  bloco é `docs/superpowers/blocos/<NN>-<resto>/`, ou seja, a branch sem o `<tipo>/`. O
  inventário sai de `bash .claude/scripts/lane.sh descobrir`.
- **Main tree.** Na `main` só passa o que a allowlist do `guard-main-shell` libera. Medido em
  2026-09-27:
  - liberam: `git fetch origin`, `git merge --ff-only origin/main`,
    `git merge-base --is-ancestor`, `git worktree list`, `git branch --list`, `gh pr view` e o
    `lane.sh` nas quatro formas;
  - negam: `git branch -d`, `docker ps`, `docker volume ls` e `docker compose ls`.

  Command que roda no main tree usa só o primeiro grupo.
- **Nenhum commit na `main`** (E8). Registros de fechamento andam na branch da lane.
- **Temporários** em `mktemp` sob `${TMPDIR:-/tmp}`, nunca dentro de `docs/`.
- **Texto.** Commands, prompts, agentes e docs em português com acento. Testes em ASCII, como os
  `*.tests.sh` existentes.
- **Commits** em Conventional Commits, em português, terminando com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (ou o modelo que de fato escreveu).
- **Referência ElaDecora**, para ler as fontes portadas (SHA fixo):
  `gh api "repos/Ela-Decora/ElaDecora-Brain/contents/<caminho>?ref=5eb74c0d58f0642286a3f7c96932c84d9b60a414" -H "Accept: application/vnd.github.raw"`.
  Caminhos: `.claude/commands/{planejar,executar,revisar,finalizar}-bloco.md` e
  `.claude/prompts/verificador-achado.md`. O ElaDecora é PowerShell, com `B-NNN`, `feat/` e
  `next_action: /command`: **porta-se o desenho, não a sintaxe**.
- **Rodar a catraca:** `bash .claude/tests/run-all.sh`; o trecho do arquivo novo sai com
  `bash .claude/tests/run-all.sh | sed -n '/^== commands.tests.sh/,/^== /p'`.

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `.claude/tests/commands.tests.sh` | catraca dos commands, agentes, papéis, plugin e aposentadoria | 1 |
| `.claude/agents/{implementador-mecanico,implementador-integracao,revisor-task,re-revisor,corretor-tardio,revisor-branch,revisor-bloco,verificador-achado,contexto-leitor}.md` | um papel despachado, com `model`/`effort` | 2 |
| `.claude/agents/auditor-docs.md` | ganha `model`/`effort` | 2 |
| `.claude/papeis.md` | tabela única de papéis; regra do `--max` | 2 |
| `.claude/prompts/verificador-achado.md` | template da lente 2 | 3 |
| `.claude/prompts/gabarito-lotus.md` | gabarito da lente 1 (o `revisar-sprint` destilado) | 3 |
| `.claude/commands/planejar-bloco.md` | fase 1 | 4 |
| `.claude/commands/executar-bloco.md` | fase 2 | 5 |
| `.claude/commands/revisar-bloco.md` | fase 3 | 6 |
| `.claude/commands/finalizar-bloco.md` | fase 4 | 7 |
| `.claude/commands/{revisar-frontend,revisar-ui}.md`, `.claude/skills/{auditar-docs,lotus-ui-review}/SKILL.md` | ganham `model`/`effort` | 8 |
| `.claude/settings.json` | liga o plugin `superpowers@claude-plugins-official` | 8 |
| `.claude/skills/{revisar-sprint,fechar-sprint}/SKILL.md` | apagados | 8 |
| `.agents/skills/{lotus-context-packet,lotus-execute-block}/SKILL.md`, `AGENTS.md` | contratos do Codex no estado por bloco | 9 |
| `docs/superpowers/state.md`, `CLAUDE.md`, `docs/superpowers/pendencias/README.md`, `docs/estrutura-monolito.md` | referências vivas (E5, E8) e a régua do harness (P-84) | 10 |
| `docs/superpowers/blocos/35-harness-commands-de-bloco/prova-catraca.md` | evidência do DoD, metade catraca | 11 |
| `docs/superpowers/blocos/35-harness-commands-de-bloco/prova-clone.md` | evidência do DoD, metade clone (E4.2) | 12 |

---

### Task 1: Catraca `commands.tests.sh`

**Files:**
- Create: `.claude/tests/commands.tests.sh`

**Interfaces:**
- Consumes: `DIR_TESTES`, `DIR_HOOKS`, `assert_igual`, `assert_contem`, `registrar_descarte`
  (`.claude/tests/_assert.sh`); `.claude/hooks/lib/ler-frontmatter.py` (argv: caminho, campos;
  stdout: uma linha, valores separados por `\x1f`).
- Produces: `cm_problemas <dir .claude>`, que ecoa um problema por linha e nada quando está
  limpo. As mensagens exatas, das quais as tasks seguintes dependem:
  - `<cmd>: command ausente`
  - `<cmd>: model [<v>], esperado <m>`
  - `<cmd>: effort [<v>], esperado <e>`
  - `<cmd>: sem disable-model-invocation: true`
  - `<cmd>: sem Skill(caveman, "ultra")`
  - `<cmd>: sem Skill(<skill>)`
  - `<arq>: model [<v>] fora dos aliases`
  - `<arq>: effort [<v>] fora da escala`
  - `papeis.md ausente`
  - `papeis.md sem agente igual: <linha>`
  - `agente sem linha igual no papeis.md: <linha>`
  - `ID fixo de modelo em <arq>`
  - `settings.json sem o plugin superpowers@claude-plugins-official`
  - `skill aposentada ainda existe: <nome>`

- [ ] **Step 1: Conferir que os nomes não colidem.** A suíte faz `source` de todos os arquivos no
  mesmo shell.

```bash
grep -rn 'cm_\|_CM_' .claude/tests/ || echo 'livre'
```

Expected: `livre`.

- [ ] **Step 2: Escrever o teste**

```bash
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
  local c=$1 nome arq s model effort dmi tab ag
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
  local c=$1 nome s arq
  local -a spec
  mkdir -p "$c/commands" "$c/agents" "$c/skills/auditar-docs" "$c/skills/lotus-ui-review"
  for nome in "${!_CM_BLOCO[@]}"; do
    read -r -a spec <<<"${_CM_BLOCO[$nome]}"
    {
      printf -- '---\ndescription: x\nargument-hint: "[NN]"\ndisable-model-invocation: true\nmodel: %s\neffort: %s\n---\n\n' "${spec[0]}" "${spec[1]}"
      printf 'Invoque `Skill(caveman, "ultra")`.\n'
      for s in "${spec[@]:2}"; do printf 'Invoque `Skill(%s)`.\n' "$s"; done
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

# O .claude/ real.
assert_igual '' "$(cm_problemas "$DIR_TESTES/..")" 'o .claude/ real passa na catraca dos commands'
```

- [ ] **Step 3: Rodar e ver o vermelho certo**

Run: `bash .claude/tests/run-all.sh | sed -n '/^== commands.tests.sh/,/^== /p'`

Expected:
- 17 linhas `ok` (a fixture e as 16 sondas);
- uma `FALHA o .claude/ real passa na catraca dos commands`, com a lista do que falta:
  `revisar-bloco: command ausente`, `finalizar-bloco: command ausente`, os `model`/`effort`/Skill
  dos dois commands existentes, `papeis.md ausente`, `settings.json sem o plugin…` e
  `skill aposentada ainda existe: revisar-sprint`/`fechar-sprint`.

Os outros arquivos da suíte seguem `ok`. Em particular o `avulso.tests.sh`, que agora roda o
arquivo novo avulso e exige a recusa pela trava.

- [ ] **Step 4: Commit** (vermelho de propósito; ele fica verde na Task 11)

```bash
git add .claude/tests/commands.tests.sh
git commit -m "test(35): catraca dos commands de bloco, vermelha contra o .claude/ real

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Agentes de papel e `papeis.md`

**Files:**
- Create: `.claude/agents/implementador-mecanico.md`
- Create: `.claude/agents/implementador-integracao.md`
- Create: `.claude/agents/revisor-task.md`
- Create: `.claude/agents/re-revisor.md`
- Create: `.claude/agents/corretor-tardio.md`
- Create: `.claude/agents/revisor-branch.md`
- Create: `.claude/agents/revisor-bloco.md`
- Create: `.claude/agents/verificador-achado.md`
- Create: `.claude/agents/contexto-leitor.md`
- Create: `.claude/papeis.md`
- Modify: `.claude/agents/auditor-docs.md:1-4` (frontmatter)

**Interfaces:**
- Produces: `subagent_type` = nome de cada arquivo, sem `.md`. As Tasks 4–7 despacham por esses
  nomes e citam `.claude/papeis.md`.

- [ ] **Step 1: Ver as linhas de papéis falhando**

Run: `bash .claude/tests/run-all.sh | sed -n '/^== commands.tests.sh/,/^== /p' | grep -i papeis`
Expected: `papeis.md ausente`.

- [ ] **Step 2: Escrever os nove agentes.** Um arquivo por bloco abaixo, conteúdo exato.

`.claude/agents/implementador-mecanico.md`:

```markdown
---
name: implementador-mecanico
description: Implementa uma task de plano do Lotus cujo código já vem pronto no plano e toca 1–2 arquivos. Despachado pelo /executar-bloco.
model: sonnet
effort: medium
---

Você implementa **uma** task de um plano do Lotus. O plano já traz o código; seu trabalho é
aplicá-lo com fidelidade e provar que funciona.

- Invoque `Skill(superpowers:test-driven-development)` antes de escrever código e siga red → green.
- Toque só os arquivos da seção **Files:** da task. `git add` nos paths exatos, nunca `-A`.
- O plano diverge do código real → pare e reporte; não improvise.
- As leis do `CLAUDE.md` §5 valem sempre; a rule da camada em `.claude/rules/` carrega ao tocar o
  arquivo.
- Termine com o report que o controlador pede: o que mudou, a saída real dos testes, o SHA do commit.
```

`.claude/agents/implementador-integracao.md`:

```markdown
---
name: implementador-integracao
description: Implementa uma task de plano do Lotus que toca vários arquivos ou exige decisão de padrão. Despachado pelo /executar-bloco.
model: sonnet
effort: high
---

Você implementa **uma** task de um plano do Lotus que atravessa arquivos ou pede escolha de padrão.

- Invoque `Skill(superpowers:test-driven-development)` antes de escrever código e siga red → green.
- Antes de decidir padrão, leia a fonte: `docs/adrs.md`, `docs/estrutura-monolito.md`, a rule da
  camada. Decisão que o plano não cobre e a fonte não resolve → pare e reporte a pergunta.
- Toque só os arquivos da seção **Files:** da task. `git add` nos paths exatos, nunca `-A`.
- As leis do `CLAUDE.md` §5 valem sempre. Parecer precisar quebrar uma → pare.
- Termine com o report: o que mudou, decisões tomadas e por quê, a saída real dos testes, o SHA.
```

`.claude/agents/revisor-task.md`:

```markdown
---
name: revisor-task
description: Revisa uma task recém-implementada contra o plano e a spec do bloco, na worktree destacada do commit dela. Não edita.
model: sonnet
effort: high
tools: Read, Grep, Glob, Bash
---

Você revisa **uma** task de um plano do Lotus, no diretório que o controlador informar (uma
worktree destacada no commit exato da task). Você não edita nada.

- Compare o diff da task com o texto dela no plano e com a spec: falta, sobra, desvio.
- Confira as leis do `CLAUDE.md` §5 e a rule da camada tocada.
- Rode a verificação que a task declara, quando ela roda sem stack. Não suba contêiner.
- Todo achado cita `arquivo:linha`. Sem citação, não é achado.
- Devolva no formato que o controlador pedir: aprovado, ou a lista de achados com severidade.
```

`.claude/agents/re-revisor.md`:

```markdown
---
name: re-revisor
description: Re-revisa só o delta de uma rodada de correção de task, contra os achados que a motivaram. Não edita.
model: sonnet
effort: medium
tools: Read, Grep, Glob, Bash
---

Você confere uma **rodada de correção**: recebe os achados da revisão anterior e o intervalo de
commits da correção. Não revise o resto da task.

- Para cada achado: corrigido, não corrigido, ou corrigido criando problema novo — com
  `arquivo:linha`.
- Não edite nada. Não abra achado fora do delta, salvo regressão que o próprio delta causou.
```

`.claude/agents/corretor-tardio.md`:

```markdown
---
name: corretor-tardio
description: Implementador das rodadas de correção 4 e 5 de uma task do Lotus, quando as rodadas anteriores não fecharam os achados.
model: sonnet
effort: max
---

Você entra numa task que já passou por três rodadas de correção sem fechar. Antes de tocar código:

- Leia os achados de todas as rodadas e os diffs de cada correção. Diga, em uma frase, por que as
  anteriores falharam.
- Invoque `Skill(superpowers:test-driven-development)`: o teste que prova o achado vem antes da
  correção.
- Toque só os arquivos da task. `git add` nos paths exatos.
- O achado exige mudar o plano → pare e reporte; isso é decisão do João.
```

`.claude/agents/revisor-branch.md`:

```markdown
---
name: revisor-branch
description: Revisão final da branch inteira de um bloco do Lotus ao fim da subagent-driven-development, antes do /revisar-bloco. Não edita.
model: opus
effort: high
tools: Read, Grep, Glob, Bash
---

Você revisa a branch inteira do bloco, do `git merge-base origin/main HEAD` até o `HEAD`, contra a
spec e o plano da pasta `docs/superpowers/blocos/<NN>-<slug>/`.

- Procure o que as revisões por task não veem: incoerência entre tasks, duplicação introduzida por
  duas tasks, contrato quebrado entre produtor e consumidor, critério de aceite do plano sem prova.
- Todo achado cita `arquivo:linha`, com severidade Crítico, Importante ou Menor.
- Não edite nada.
```

`.claude/agents/revisor-bloco.md`:

```markdown
---
name: revisor-bloco
description: Lente 1 do /revisar-bloco. Revisa o diff do bloco contra o gabarito do Lotus e devolve achados no formato Q-N. Não edita.
model: opus
effort: high
tools: Read, Grep, Glob, Bash
---

Você é a lente 1 da revisão de um bloco do Lotus. O controlador passa três caminhos: o arquivo com
o diff do bloco, `.claude/prompts/gabarito-lotus.md` e a pasta do bloco (spec e plano).

- Leia o gabarito inteiro antes do diff. Ele manda na ordem de autoridade, no escopo, nos falsos
  positivos e no formato.
- Leia o diff pelo arquivo. Ele não vai colado na conversa.
- Devolva no máximo dez achados, no formato Q-N do gabarito, cada um com severidade Crítico,
  Importante ou Menor e `arquivo:linha`.
- Código bom se diz bom. Achado inventado destrói a confiança na revisão.
- Não edite nada.
```

`.claude/agents/verificador-achado.md`:

```markdown
---
name: verificador-achado
description: Lente 2 do /revisar-bloco. Verifica um único achado de revisão contra o código real e devolve CONFIRMED, PLAUSIBLE ou REFUTED.
model: sonnet
effort: medium
tools: Read, Grep, Glob
---

O prompt que você recebe é o template `.claude/prompts/verificador-achado.md` já preenchido com
um achado e o caminho do diff. Siga-o à risca. Você só viu este achado; não peça os outros.
```

`.claude/agents/contexto-leitor.md`:

```markdown
---
name: contexto-leitor
description: Levantamento de contexto somente-leitura para o Context Packet de um bloco do Lotus, um domínio por despacho, quando o Codex não está disponível.
model: sonnet
effort: medium
---

Você levanta contexto para **um** domínio de um bloco do Lotus (uma tela, um contrato de API, um
schema) e devolve a sua parte do Context Packet no contrato de
`.agents/skills/lotus-context-packet/SKILL.md`.

- **Somente leitura.** Não edite arquivo do repositório, não escreva em Drive, Notion ou Figma, não
  mude estado.
- Fonte externa se referencia por ID, nunca por nome de exibição (`AGENTS.md` §3).
- Fonte que você não conseguiu ler sai registrada como indisponível, com o erro capturado.
```

- [ ] **Step 3: Frontmatter do `auditor-docs`.** Em `.claude/agents/auditor-docs.md`, a linha
  `tools: Read, Grep, Glob` passa a ser seguida de:

```yaml
model: sonnet
effort: medium
```

- [ ] **Step 4: Escrever `.claude/papeis.md`**

```markdown
# Papéis — modelo e esforço por despacho

A ferramenta `Agent` aceita `model` por chamada, mas **não aceita esforço**: esforço só vem do
frontmatter de um agente em `.claude/agents/`. Por isso cada papel que os commands de bloco
despacham é um agente, chamado por `subagent_type`. Esta tabela é a única lista deles, e
`.claude/tests/commands.tests.sh` reprova quando ela e `.claude/agents/` divergem em qualquer
sentido — nome, modelo ou esforço.

| Agente | Papel | model | effort |
|---|---|---|---|
| `implementador-mecanico` | task com código pronto no plano, 1–2 arquivos | sonnet | medium |
| `implementador-integracao` | task multi-arquivo ou com decisão de padrão | sonnet | high |
| `revisor-task` | revisão de task na SDD | sonnet | high |
| `re-revisor` | re-revisão escopada de rodada de correção | sonnet | medium |
| `corretor-tardio` | implementador nas rodadas de correção 4–5 | sonnet | max |
| `revisor-branch` | revisão final da branch na SDD | opus | high |
| `revisor-bloco` | lente 1 do `/revisar-bloco` | opus | high |
| `verificador-achado` | lente 2, um por achado | sonnet | medium |
| `contexto-leitor` | levantamento de contexto somente-leitura | sonnet | medium |
| `auditor-docs` | auditoria de docs contra o código (skill `auditar-docs`) | sonnet | medium |

## Regras

- **Alias sempre, nunca ID.** `opus`, `sonnet`, `haiku`, `fable`.
- **`--max` tem uma definição só:** sobe `sonnet` para `opus` em todo despacho do command, pelo
  parâmetro `model` do `Agent`. O esforço de cada papel continua o do frontmatter dele, e o da
  sessão continua o do frontmatter do command.
- **Papel novo** nasce aqui e em `.claude/agents/` no mesmo commit; a catraca cobra os dois lados.
```

- [ ] **Step 5: Rodar a catraca**

Run: `bash .claude/tests/run-all.sh | sed -n '/^== commands.tests.sh/,/^== /p'`

Expected: a `FALHA` do `.claude/` real **não** lista mais `papeis.md ausente`, nem
`papeis.md sem agente igual`, nem `agente sem linha igual`, nem nenhuma linha `agents/…`. O resto
das faltas continua listado.

- [ ] **Step 6: Commit**

```bash
git add .claude/agents/ .claude/papeis.md
git commit -m "feat(35): agentes de papel com modelo e esforço, e a tabela papeis.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Prompts das duas lentes

**Files:**
- Create: `.claude/prompts/verificador-achado.md`
- Create: `.claude/prompts/gabarito-lotus.md`

**Interfaces:**
- Consumes: `.claude/skills/revisar-sprint/SKILL.md`, **só leitura** (a Task 8 o apaga depois).
- Produces: `verificador-achado.md` com os marcadores literais `{ACHADO}` e `{CAMINHO_DIFF}`;
  `gabarito-lotus.md` com a escala Crítico/Importante/Menor. A Task 6 usa os dois.

- [ ] **Step 1: Portar o verificador verbatim**

```bash
mkdir -p .claude/prompts
gh api "repos/Ela-Decora/ElaDecora-Brain/contents/.claude/prompts/verificador-achado.md?ref=5eb74c0d58f0642286a3f7c96932c84d9b60a414" \
  -H "Accept: application/vnd.github.raw" > .claude/prompts/verificador-achado.md
grep -c '{ACHADO}\|{CAMINHO_DIFF}' .claude/prompts/verificador-achado.md
```

Expected: `2`. O arquivo já está em português e não tem nada específico do ElaDecora; nenhuma
edição.

- [ ] **Step 2: Montar o gabarito.** `.claude/prompts/gabarito-lotus.md` tem este cabeçalho,
  literal:

```markdown
# Gabarito do Lotus — lente 1 do `/revisar-bloco`

Destilado da antiga skill `revisar-sprint` (aposentada no item 35). Quem lê é o agente
`revisor-bloco`. Revise **somente o diff** cujo caminho você recebeu, contra a spec e o plano da
pasta do bloco. Sem este gabarito a revisão vira `/code-review` genérico.

## Escala de severidade

| Aqui | No formato Q-N | Quando |
|---|---|---|
| Crítico | 🔴 antes do próximo bloco | viola lei do §5, lição, ADR, ou quebra comportamento |
| Importante | 🟡 em breve | convenção ferida com dano real; risco que o próximo bloco herda |
| Menor | 🟢 melhoria | o resto |

Crítico e Importante `CONFIRMED` bloqueiam o `/finalizar-bloco` até corrigidos ou deferidos pelo
João.
```

Depois do cabeçalho vêm, **verbatim** e nesta ordem, as seções de
`.claude/skills/revisar-sprint/SKILL.md`:
1. `## Gabarito (nesta ordem de autoridade)`;
2. `## Escopo` — trocando "que `active_work_item` tocou" por "que o bloco tocou (o diff recebido)";
3. `## Passo 1 — Órfãos (existência)`, inteira, com os falsos positivos;
4. `## Passo 2 — Padrões júnior vs. sênior`, inteira;
5. `## Formato de cada achado` — com a linha `**Severidade:**` reescrita como
   `**Severidade:**   Crítico 🔴 | Importante 🟡 | Menor 🟢`;
6. `## Regras da revisão`, inteira;
7. o parágrafo `**Padrão reincidente (2+ sprints)** …`, que no original fica em
   `## Saída e handoff`, sob o título `## Padrão reincidente`.

**Não** entram: o gate de estado, a `## Classificação de risco` (ela vai para o command, na Task 6)
e o handoff de estado.

- [ ] **Step 3: Verificar a destilação**

```bash
grep -c '^## ' .claude/prompts/gabarito-lotus.md
grep -n 'state.md\|lanes\|focused_lane\|workflow_state\|active_work_item' .claude/prompts/gabarito-lotus.md || echo 'sem estado'
grep -n 'Falsos positivos deste projeto\|Máximo 10 achados\|Estilo não é achado' .claude/prompts/gabarito-lotus.md
```

Expected:
- `8` cabeçalhos `##`: Escala, Gabarito, Escopo, Passo 1, Passo 2, Formato, Regras e Padrão
  reincidente;
- `sem estado`;
- as três frases encontradas.

- [ ] **Step 4: Commit**

```bash
git add .claude/prompts/
git commit -m "feat(35): prompts da revisão de duas lentes — gabarito do Lotus e verificador de achado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `/planejar-bloco`

**Files:**
- Modify: `.claude/commands/planejar-bloco.md` (reescrito inteiro)

**Interfaces:**
- Consumes:
  - `lane.sh abrir <NN> <tipo> <slug> [--modelo <alias>]`, que imprime
    `LANE ABERTA: <branch> em <árvore>`;
  - `lane.sh conferir <NN>`, que sai 1 nomeando arquivos;
  - o agente `contexto-leitor`;
  - a skill Codex `lotus-context-packet` (Task 9 ajusta o `SUGGESTED_PATH`).
- Produces: o bloco termina com `estado.md` em `ready_for_execution`, `spec.md` e `plano.md` na
  pasta do bloco. O plano tem as seções `## Grupos paralelos` e `## Handoff de execução`, que as
  Tasks 5 e 7 leem.

- [ ] **Step 1: Ver as linhas vermelhas do command**

Run: `bash .claude/tests/run-all.sh | grep 'planejar-bloco:'`
Expected: `model […], esperado opus`, `effort […], esperado high`, `sem Skill(caveman, "ultra")` e
as três `sem Skill(superpowers:…)`.

- [ ] **Step 2: Ler as fontes.** São três:
  - o `planejar-bloco.md` do ElaDecora (comando da referência nas Global Constraints);
  - o `.claude/commands/planejar-bloco.md` atual, só a seção `## Rota \`context_required\` → Codex`,
    que é portada;
  - a spec compartilhada §5.3 e as emendas E2, E7 e E8 da spec do bloco.

- [ ] **Step 3: Escrever o command.** Estrutura obrigatória, nesta ordem, com o conteúdo de cada
  passo:

```markdown
---
description: Abre um bloco do Lotus — ficha, lane, brainstorming, spec e plano. Não implementa nada.
argument-hint: "[NN | texto livre] [--max]"
disable-model-invocation: true
model: opus
effort: high
---

# /planejar-bloco

Fase 1 de 4 do harness de blocos. Desenho: spec compartilhada
`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md` §5.3, com as emendas da
spec do bloco 35.

Argumento: `$ARGUMENTS`

<preâmbulo "Regra de invocação de skill" das Global Constraints, verbatim>
```

Os passos, cada um como `## Passo N — <título>`:

1. **Caveman.** "Invoque `Skill(caveman, \"ultra\")`. Confirme em uma linha que carregou."
2. **Main tree na `main`.** Rodar `git rev-parse --show-toplevel`,
   `git rev-parse --abbrev-ref HEAD` e `git worktree list --porcelain`. A árvore tem de ser a
   primeira entrada do `worktree list`, na branch `main`. Dentro de lane → parar e dizer qual,
   pelo `bash .claude/scripts/lane.sh descobrir`: uma sessão conduz uma lane só, e planejar abre
   outra. O teto de lanes e a independência ficam para o portão do `abrir`, no Passo 6.
3. **Resolver a ficha.**
   - `NN` → a seção `## <NN>. \`<slug>\`` de `docs/superpowers/backlog.md`. Ausente → para. A ficha
     sob `## Aguardando aceitação` → para: o que falta é prova, e o command é `/finalizar-bloco`.
     Essa tabela só existe depois do item 36; dizer isso.
   - Lidos da ficha: slug, `**Contexto:**`, `**Depende:**`.
   - **Texto livre** → propõe a ficha no formato das existentes (título, linha
     Prioridade/Frente/Contexto/Depende, Fonte, Objetivo, Escopo, Fora, DoD) com o próximo número
     livre: maior `## NN.` do backlog + 1, conferido contra `git branch -a` e
     `docs/superpowers/blocos/`. E **para**: a ficha entra na `main` por PR de docs (E8,
     invariante 10), e o command volta com o `NN`. Promover é do João (invariante 8).
   - Sem argumento → lista as fichas e pergunta. Nunca escolhe.
4. **Context Packet, se `Contexto: sim`.** Ainda não há lane, então o packet vai para um
   temporário, `mktemp "${TMPDIR:-/tmp}/lotus-packet-<NN>.XXXXXX.md"`, e só entra no repositório
   no Passo 6.
   - **Rota Codex:** portar os itens 1, 2, 3 e 6 da seção `## Rota \`context_required\` → Codex`
     do command atual: `ToolSearch "select:mcp__codex__codex"`, o fallback `codex-companion` sem
     `--write`, a proibição do `codex:codex-rescue`, a validação dos markers e o `status: partial`.
     Muda: a skill `lotus-context-packet` recebe `NN`, slug, branch `main` e commit, em vez de
     `active_work_item`, e **não há transição de estado aqui**. Packet `blocked` → para, sem lane.
   - **Codex indisponível:** "Invoque `Skill(superpowers:dispatching-parallel-agents)`", com um
     agente `contexto-leitor` (`subagent_type`) por domínio independente, todos
     somente-leitura, na mesma resposta. As partes se fundem num packet só, com o mesmo contrato.
   - Regra dura, em negrito: **agente que escreve nunca é despachado em paralelo com agente que
     escreve.**
5. **Brainstorming.** "Invoque `Skill(superpowers:brainstorming)`. Confirme que carregou."
   - Dizer à skill que a spec vai para `docs/superpowers/blocos/<NN>-<slug>/spec.md`; o default
     vence se ninguém falar. O gate de aprovação dela é obrigatório.
   - Classificação, com o texto do ElaDecora adaptado: *spike* encerra sem lane (não cria branch;
     reporta a recomendação; a ficha fica); *bounded* segue curto, **mas produz spec e plano**;
     *architectural* segue inteiro.
   - Classificação ≠ *spike* → **parar e executar o Passo 6 antes de a skill gravar a spec**:
     o commit dela tem de cair na branch do bloco.
6. **Abrir a lane.**
   - Escolher o `<tipo>` da D5 (`feat fix chore refactor infra cicd docs`) pelo conteúdo da ficha
     e declará-lo em uma linha.
   - Rodar `bash .claude/scripts/lane.sh abrir <NN> <tipo> <slug> --modelo <alias da sessão>`.
     `PORTAO RECUSOU` → para: mexer na fila é decisão do João.
   - Deu certo: `EnterWorktree(path: "<caminho absoluto impresso pelo LANE ABERTA>")`. Da sessão no
     main tree o caminho irmão é aceito (E2).
   - Havendo packet: copiar para `docs/superpowers/blocos/<NN>-<slug>/context.md`; ele é
     commitado com a spec.
   - O stack não sobe aqui; a saída do `abrir` já diz como subir.
   - Voltar ao Passo 5.
7. **Spec.** A spec tem a seção `## Verificação externa` **sempre**. Portar o Passo 7 do ElaDecora:
   lista numerada com `prova:` por item, ou a linha "Nenhuma. … `efeito_externo: nao`." sem item
   numerado.
   - Prova declarativa: `<alias> <GET|HEAD> <caminho> -> <código>`, com aliases `producao` e
     `local`. Até o item 36 a prova fica registrada e não é executada, e item sem superfície HTTP
     declara `prova: nenhuma`.
   - A spec é commitada na lane.
8. **Plano.** "Invoque `Skill(superpowers:writing-plans)`. Confirme que carregou." Dizer o
   caminho `docs/superpowers/blocos/<NN>-<slug>/plano.md`. Pedir duas seções depois das tasks:
   - `## Grupos paralelos` — tabela `Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces`.
     A validação é mecânica e por par: a interseção de `Files:` é vazia e não há aresta entre as
     duas tasks. Grupo que falha é desfeito, não negociado.
   - `## Handoff de execução` — `executor: claude|codex`, modelo e esforço da sessão, os papéis de
     `.claude/papeis.md` que a execução vai despachar e, para `codex`, `paths_autorizados` com
     globs exatos. Critério do command atual: `codex` para task mecânica com verificação
     executável e paths fechados; `claude` quando toca lei do §5, arquitetura ou julgamento fora
     do plano.

   Depois rodar `bash .claude/scripts/lane.sh conferir <NN>`. Sai 1 → para, e diz que a saída é
   replanejar ou esperar a outra lane fechar.
9. **Gravar o estado** no **mesmo commit do plano**:

```yaml
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
active_spec: docs/superpowers/blocos/<NN>-<slug>/spec.md
active_plan: docs/superpowers/blocos/<NN>-<slug>/plano.md
context_packet: docs/superpowers/blocos/<NN>-<slug>/context.md  # null quando Contexto: não
efeito_externo: <sim|nao>
executor: <claude|codex>
active_acceptance: null
commit: <git rev-parse --short HEAD antes do commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

   - `efeito_externo` vale `sim` quando `## Verificação externa` tem item numerado, e `nao` quando
     declara nenhum.
   - `active_acceptance` fica `null` até o item 36 trazer o `aceitacao.md`.
   - `id`, `slug`, `branch`, `worktree`, `offset` e `lane_base` são do `lane.sh` e não se
     reescrevem.
10. **Parar.** "Este command nunca implementa." Reporta: bloco, branch, spec, plano, número de
    tasks, e que o próximo é `/executar-bloco <NN>`, numa sessão aberta na lane.

Seção final `## \`--max\``: `--max` sobe `sonnet` para `opus` em todo despacho deste command, pelo
parâmetro `model: "opus"` da ferramenta `Agent`, conforme `.claude/papeis.md`. O esforço da
sessão não muda.

- [ ] **Step 4: Verificar**

```bash
bash .claude/tests/run-all.sh | grep 'planejar-bloco:' || echo 'planejar-bloco limpo'
grep -c 'lane.sh abrir\|lane.sh conferir\|EnterWorktree\|## Verificação externa\|## Grupos paralelos\|## Handoff de execução\|contexto-leitor' .claude/commands/planejar-bloco.md
grep -n 'state.md\|focused_lane\|lanes:\|active_work_item' .claude/commands/planejar-bloco.md || echo 'sem estado antigo'
```

Expected:
- `planejar-bloco limpo`;
- contagem ≥ 7;
- `sem estado antigo`. Citar o `state.md` como contrato é permitido; se aparecer, a linha tem de
  ser só isso.

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/planejar-bloco.md
git commit -m "feat(35): /planejar-bloco no desenho do ElaDecora — ficha, lane, spec e plano na pasta do bloco

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `/executar-bloco`

**Files:**
- Modify: `.claude/commands/executar-bloco.md` (reescrito inteiro)

**Interfaces:**
- Consumes:
  - `estado.md` em `ready_for_execution` (Task 4) e a `## Handoff de execução` do plano;
  - `.claude/papeis.md` e os agentes da Task 2;
  - a skill Codex `lotus-execute-block` (Task 9).
- Produces: `estado.md` em `ready_for_review` e `rulings.md` na pasta do bloco. A Task 6 lê os
  dois.

- [ ] **Step 1: Ver as linhas vermelhas**

Run: `bash .claude/tests/run-all.sh | grep 'executar-bloco:'`
Expected: `model`, `effort`, caveman e as três `sem Skill(superpowers:…)`.

- [ ] **Step 2: Ler as fontes.** São três:
  - o `executar-bloco.md` do ElaDecora;
  - o `.claude/commands/executar-bloco.md` atual, só as seções `### Gate de delegação (handoff)`,
    `## TDD e disciplina Git` e `## Definition of Done`, que são portadas;
  - a spec compartilhada §5.4.

- [ ] **Step 3: Escrever o command.**

Frontmatter:

```markdown
---
description: Executa o plano do bloco da lane atual, com revisão por task. Não replaneja.
argument-hint: "[NN] [--simples] [--max]"
disable-model-invocation: true
model: sonnet
effort: medium
---
```

Depois vêm o título `# /executar-bloco`, a linha "Fase 2 de 4…", `Argumento: \`$ARGUMENTS\`` e o
preâmbulo verbatim. Os passos, cada um como `## Passo N — <título>`:

1. **Caveman** — `Skill(caveman, "ultra")`.
2. **Validar o estado.** A lane é a branch atual, pelo regex das Global Constraints; fora de lane →
   para, porque execução acontece na worktree do bloco. A pasta sai da branch. Argumento `NN`
   diferente do da branch → para (invariante 7). Conferir, nesta ordem:
   - 0: não é `blocked` (se for, relatar `blocker` e `resume_state` e parar);
   - 1: estado `ready_for_execution` ou `executing`;
   - 2: `active_plan` preenchido e existente;
   - 3: `branch` do estado igual à atual;
   - 4: `context_packet` existente quando não é `null`;
   - 5: `efeito_externo` e `executor` preenchidos.

   Divergência → para, sem "consertar" o arquivo.
3. **Rota pelo `executor`.**
   - `codex` → portar **inteira** a subseção `### Gate de delegação (handoff)` do command atual:
     carga do Codex com `--write`, `lotus-execute-block` com `plan_path`, intervalo de tasks e
     commit base, e os itens 1–5 do gate. Diff fora de `paths_autorizados` → `blocked`.
   - `claude` → contar as tasks (`grep -cE '^### Task' <plano>`) e os arquivos distintos:

```bash
grep -E '^[[:space:]]*- (Create|Modify|Test|Delete):' <plano> | grep -o '`[^`]*`' | sed -E 's/:[0-9]+(-[0-9]+)?`$/`/' | sort -u | wc -l
```

     Com `--simples`, ou com até 3 tasks **e** até 2 arquivos, a escolha é `executing-plans`; no
     resto, `subagent-driven-development`. Declarar a escolha com as duas contagens.
4. **Gravar `executing`** no commit da primeira task durável (invariante 6):
   `workflow_state: executing`, `next_owner: claude`, `next_action: continue_active_plan`,
   `commit`, `updated_at`, `updated_by`.
5. **Executar.** Uma só, nunca as duas: "Invoque `Skill(superpowers:subagent-driven-development)`"
   ou "Invoque `Skill(superpowers:executing-plans)`". Confirmar que carregou e deixar a skill
   conduzir.
   - Despacho por `subagent_type`, pela tabela de `.claude/papeis.md`: `implementador-mecanico`,
     `implementador-integracao`, `revisor-task`, `re-revisor`, `corretor-tardio`,
     `revisor-branch`. Sem papel na tabela → declarar e usar o mais próximo.
     `--max` → `model: "opus"` em todo `Agent`.
   - O prompt de **todo** implementador leva a linha "Invoque
     `Skill(superpowers:test-driven-development)` antes de escrever código."
   - **Stack:** quando o bloco toca `backend/`, `cd <lane> && docker compose up -d` antes da
     primeira task. As portas saem do `.env` da lane (offset). A P-03 caiu (spec §3.2): backend
     não roda mais no main tree.
   - **Subpasso 5.1 — Pipeline de profundidade 1.** Portar o texto do ElaDecora, com as três
     amarras e o desvio registrado em `rulings.md`. A worktree do revisor, em bash:

```bash
sha=$(git rev-parse --short HEAD)
rev="$(dirname "$(git rev-parse --show-toplevel)")/lotus-rev-$sha"
git worktree add --detach "$rev" "$sha"
ln -s "$(git rev-parse --show-toplevel)/frontend/node_modules" "$rev/frontend/node_modules"
# ... revisor-task trabalha em $rev, sem subir stack ...
rm "$rev/frontend/node_modules"   # so o link; nunca rm -r: atravessaria para o node_modules real
git worktree remove "$rev"
```

     "Worktree de revisão não conta no teto de três lanes e não casa o padrão de lane." Correção
     é sequencial: escrever nunca é paralelo.
   - Portar do command atual `## TDD e disciplina Git` e `## Definition of Done`, **sem** o
     `### Gate main tree/worktree` (a P-03 caiu) e **sem** a `### Classificação inline` (a
     escolha agora é a do Passo 3).
6. **Preservar as decisões.** A lista "Rulings I made" da SDD vai para
   `docs/superpowers/blocos/<NN>-<slug>/rulings.md`, uma decisão por linha com o que custa se
   estiver errada. Sem rulings → a linha `Nenhuma decisão foi tomada em nome do João.` Commit.
7. **Parar antes da revisão.** "A skill termina apontando para `finishing-a-development-branch`.
   **Não siga esse ponteiro.**" O estado vai a `ready_for_review`, com `next_owner: claude`,
   `next_action: request_code_review`, `commit`, `updated_at` e `updated_by`. Reporta as tasks,
   o intervalo de commits, as rulings e que o próximo é `/revisar-bloco <NN>`.

- [ ] **Step 4: Verificar**

```bash
bash .claude/tests/run-all.sh | grep 'executar-bloco:' || echo 'executar-bloco limpo'
grep -c 'lotus-rev-\|rulings.md\|papeis.md\|lotus-execute-block\|paths_autorizados\|request_code_review' .claude/commands/executar-bloco.md
grep -n 'rm -r\|Gate main tree\|P-03.*main tree' .claude/commands/executar-bloco.md
```

Expected:
- `executar-bloco limpo`;
- contagem ≥ 6;
- o último grep só acha a linha do comentário "nunca rm -r" e a frase "A P-03 caiu".

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/executar-bloco.md
git commit -m "feat(35): /executar-bloco na lane, papéis por subagent_type e pipeline de profundidade 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `/revisar-bloco`

**Files:**
- Create: `.claude/commands/revisar-bloco.md`

**Interfaces:**
- Consumes:
  - `.claude/prompts/gabarito-lotus.md` e `.claude/prompts/verificador-achado.md` (Task 3);
  - os agentes `revisor-bloco` e `verificador-achado` (Task 2);
  - `estado.md` em `ready_for_review` (Task 5).
- Produces: `docs/superpowers/blocos/<NN>-<slug>/revisao.md` com `## Em aberto` única no topo, e
  o estado em `ready_for_closure` ou `reviewing`. A Task 7 lê o `## Em aberto`.

- [ ] **Step 1: Ver as linhas vermelhas**

Run: `bash .claude/tests/run-all.sh | grep 'revisar-bloco:'`
Expected: `revisar-bloco: command ausente`.

- [ ] **Step 2: Ler as fontes.** São três:
  - o `revisar-bloco.md` do ElaDecora;
  - de `.claude/skills/revisar-sprint/SKILL.md`, só a `## Classificação de risco` e as regras de
    `## Saída e handoff`;
  - a spec compartilhada §5.5.

- [ ] **Step 3: Escrever o command.**

Frontmatter:

```markdown
---
description: Revisa o bloco da lane em duas lentes — gabarito do Lotus e verificação adversarial de cada achado.
argument-hint: "[NN]"
disable-model-invocation: true
model: opus
effort: high
---
```

Depois vêm o título, "Fase 3 de 4…", o argumento e o preâmbulo verbatim. Os passos:

1. **Caveman** — `Skill(caveman, "ultra")`.
2. **Validar o estado.**
   - `blocked` → relata e para.
   - Aceitos: `ready_for_review` ou `reviewing`.
   - O `NN` vem da branch; argumento divergente → para (invariante 7, "revisar o bloco do
     vizinho").
   - De `ready_for_review` a transição para `reviewing` entra no commit do relatório, no Passo 7.
3. **Montar o diff**, em bash:

```bash
branch=$(git rev-parse --abbrev-ref HEAD)
[[ $branch =~ ^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$ ]] || { echo "esta arvore nao e lane: $branch"; exit 1; }
nn=${BASH_REMATCH[2]}
git fetch origin
base=$(git merge-base origin/main HEAD); head=$(git rev-parse HEAD)
saida=$(mktemp "${TMPDIR:-/tmp}/lotus-revisao-$nn-XXXXXX.txt")
{ git log --oneline "$base..$head"; git diff --stat "$base..$head"; git diff -U10 "$base..$head"; } > "$saida"
echo "$saida"
```

   Regra em negrito: "**Nunca cole o diff no seu contexto** e nunca o grave em `docs/`: ele vai
   como caminho de arquivo para os subagentes."
4. **Lente 1.**
   - Primeiro a `## Classificação de risco` do `revisar-sprint`, verbatim, em uma linha. Alto
     risco é: lei do §5, dinheiro, certificado ou documento legal, ou `executor: codex`.
   - "Invoque `Skill(superpowers:requesting-code-review)`. Confirme que carregou."
   - Despachar `subagent_type: revisor-bloco` com três caminhos: o do diff,
     `.claude/prompts/gabarito-lotus.md` e a pasta do bloco. `--max` não se aplica: o
     `revisor-bloco` já é `opus`.
   - Registrar os achados brutos com severidade Crítico, Importante ou Menor, sem julgar.
   - **Alto risco** → lente Codex read-only em paralelo, com o texto da revisão independente do
     `revisar-sprint` (carga do Codex **sem** `--write` e formato
     `arquivo:linha — problema — impacto`). Os achados das duas se fundem e se deduplicam; o que
     só o Codex viu vai para a lente 2 como qualquer outro.
5. **Lente 2.** "Invoque `Skill(superpowers:dispatching-parallel-agents)`. Confirme que carregou."
   - Um `subagent_type: verificador-achado` **por achado**, todos em paralelo, cada um com
     `.claude/prompts/verificador-achado.md` preenchido (`{ACHADO}` e `{CAMINHO_DIFF}`).
   - Nunca a lista inteira para um só. Sem o raciocínio da lente 1, sem os outros achados, sem
     resumo.
   - Vereditos, exatamente: `CONFIRMED`, `PLAUSIBLE`, `REFUTED`.
6. **Tratar os achados.** "Invoque `Skill(superpowers:receiving-code-review)`. Confirme que
   carregou."
   - Sobre os `CONFIRMED`: **Crítico ou Importante espera a aprovação do João antes de qualquer
     correção** (regra do Lotus).
   - `PLAUSIBLE` fica como observação e não bloqueia; `REFUTED` não gera trabalho.
   - Trabalho deferido vira **ficha proposta** no `revisao.md`, porque ficha nova entra por PR de
     docs (E8).
   - Divergência de doc vai para `docs/superpowers/pendencias/abertas.md`.
   - "Padrão reincidente vira regra" (gabarito).
7. **Escrever `revisao.md`.** Portar o formato do ElaDecora com `# <NN> — Revisão`:
   - `## Em aberto` é única, fica no topo e é reescrita a cada rodada;
   - cada rodada é `## Rodada N — \`<base>..<head>\` — <data> · Lente 1: <modelo> · Lente 2: <modelo>`,
     com a tabela `# | Severidade | Achado | Veredito | Evidência | Situação` e o placar;
   - rodada nova entra acima das antigas, e nenhuma é editada;
   - `REFUTED` antigos ficam, porque medem a lente 2.

   Commitar o relatório com a transição de estado e depois `rm "$saida"`.
8. **Transição**, no commit do relatório.
   - Sem Crítico ou Importante em aberto:

```yaml
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
active_review: docs/superpowers/blocos/<NN>-<slug>/revisao.md
blocker: null
resume_state: null
```

   - Com algum em aberto: `workflow_state: reviewing`, `active_review` preenchido,
     `next_owner: joao` quando espera aprovação ou `claude` com as correções já aprovadas,
     `next_action: approve_review_findings <Q-N…>`.

   Mais `commit`, `updated_at` e `updated_by`. Reportar o placar e a decisão.

- [ ] **Step 4: Verificar**

```bash
bash .claude/tests/run-all.sh | grep 'revisar-bloco:' || echo 'revisar-bloco limpo'
grep -c 'revisor-bloco\|verificador-achado\|gabarito-lotus.md\|## Em aberto\|CONFIRMED\|mktemp' .claude/commands/revisar-bloco.md
```

Expected: `revisar-bloco limpo` e contagem ≥ 6.

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/revisar-bloco.md
git commit -m "feat(35): /revisar-bloco de duas lentes com o gabarito do Lotus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `/finalizar-bloco`

**Files:**
- Create: `.claude/commands/finalizar-bloco.md`

**Interfaces:**
- Consumes:
  - `revisao.md` com `## Em aberto` (Task 6);
  - `lane.sh descobrir`, com as linhas `lane␟NN␟…` e `sem-arvore␟NN␟branch`;
  - `lane.sh fechar <NN>`.
- Produces: o PR do bloco, com os registros de fechamento no último commit da lane (E8); no pós-PR,
  a lane fechada.

- [ ] **Step 1: Ver as linhas vermelhas**

Run: `bash .claude/tests/run-all.sh | grep 'finalizar-bloco:'`
Expected: `finalizar-bloco: command ausente`.

- [ ] **Step 2: Ler as fontes.** São quatro:
  - o `finalizar-bloco.md` do ElaDecora;
  - `.claude/skills/fechar-sprint/SKILL.md`, só os itens 0, 1–7 e o limite de dez entradas do
    item 9;
  - a spec compartilhada §5.6;
  - a emenda E8.

- [ ] **Step 3: Escrever o command.**

Frontmatter:

```markdown
---
description: Fecha o bloco — verificação fresca, portão da revisão, registros de fechamento na lane, PR; depois do merge, fecha a lane.
argument-hint: "[NN]"
disable-model-invocation: true
model: sonnet
effort: high
---
```

Depois vêm o título, "Fase 4 de 4…", o argumento e o preâmbulo verbatim. Os passos:

1. **Caveman** — `Skill(caveman, "ultra")`.
2. **Descobrir o modo.** O primeiro que casar vence:
   - **normal** — a sessão está numa lane (regex da branch) e o estado é `ready_for_closure`;
   - **pós-PR** — a sessão está no main tree, na `main`, e o argumento `NN` é obrigatório. O
     `lane.sh descobrir` mostra a lane `NN` com estado `closed`. Depois de `git fetch origin`,
     `git merge-base --is-ancestor <branch> origin/main` sai 0. Se sair 1, o PR ainda não
     mesclou: relata e para;
   - **conserto** — a sessão está no main tree, e o `descobrir` traz `sem-arvore␟NN␟<branch>`.
     Branch ancestral de `origin/main` → pedir ao João, no terminal dele, o
     `git branch -d <branch>`: a allowlist da `main` nega esse comando. Não mesclada → relata e
     para. Nunca `-D`;
   - **aceitação** — bloco em `blocked` esperando prova externa → para: "o modo aceitação chega
     com o item 36";
   - **nada casa** → relata `workflow_state`, `next_owner` e `next_action` e para.
3. **Verificação com evidência fresca** (modo normal). "Invoque
   `Skill(superpowers:verification-before-completion)`. Confirme que carregou."
   - As áreas tocadas saem de
     `git diff --name-only $(git merge-base origin/main HEAD)..HEAD`.
   - Tudo roda **no stack da lane** (`docker compose up -d` na árvore dela, portas do `.env`):
     - `backend/` → `docker compose exec -T app php artisan test` e
       `cd backend && ./vendor/bin/pint <arquivos .php do bloco>`, seguido de
       `git diff --exit-code` nesses arquivos;
     - `frontend/` → `pnpm lint`, `pnpm test`, `pnpm build`;
     - DTO em `backend/app/**/Data/` → `docker compose exec -T app php artisan typescript:transform`
       seguido de `git diff --exit-code` no `generated.ts` (caminho em
       `.claude/rules/generated-types.md`);
     - `.claude/` → `bash .claude/tests/run-all.sh`.
   - **O item 0 do `fechar-sprint`, verbatim, com a nota do curl (`Origin` e `Accept`)**: a prova
     end-to-end do critério de aceite contra a API real, com as portas `8080+offset` e
     `5173+offset`. Bloco só de docs → a skill `auditar-docs`. Este item não se pula.
   - Portar também os itens 5 (código morto) e 6 (leis) do `fechar-sprint`.
4. **Portão da revisão.** A seção `## Em aberto` do `active_review` está vazia; senão, para.
5. **Atualizar contra `origin/main`.** `git fetch origin` e `git merge origin/main`: merge, não
   rebase, porque `revisao.md` e `rulings.md` citam SHA. Conflito → para e relata. Sem rede →
   para. Depois do merge, refazer o Passo 3.
6. **Registros de fechamento na lane (E8)**, num commit só:
   - a. **`efeito_externo`:**
     - `null` ou ausente → para (`null` nunca vale `nao`);
     - `sim` → até o item 36, a prova do efeito externo vai registrada no corpo do `estado.md`
       (invariante 11); sem ela, para;
     - `nao` → segue.
   - b. **Pendências** — o item 7 do `fechar-sprint`, verbatim: gatilho vencido; ficha que fechou
     (`abertas.md` → `encerradas.md`, e o índice `README.md` acompanha); encerrada com mais de 1
     sprint sai; ficha que nasceu.
   - c. **Histórico** — uma linha em `docs/superpowers/historico/progress.md`, com no máximo dez
     entradas; o excesso desce para `progress-archive.md`, verbatim.
   - d. **Backlog** — remover **só a própria ficha**: a seção `## <NN>. …` até antes do próximo
     `---` ou `## `. Nenhuma outra linha do `backlog.md` muda.
   - e. **Estado:**

```yaml
workflow_state: closed
next_owner: joao
next_action: none
blocker: null
resume_state: null
```

     Mais `commit`, `updated_at` e `updated_by`.
   - f. Commit `chore(close): item <NN> fecha …`.
   - Regra para o que vier depois: "PR que volta com correção → o commit que corrige reescreve o
     `estado.md` para `executing` ou `reviewing`, porque `closed` deixou de ser verdade, e a cadeia
     recomeça no command desse estado."
7. **Integração.** "Invoque `Skill(superpowers:finishing-a-development-branch)`. Confirme que
   carregou."
   - Apresentar o menu como a skill escreve, com o **merge local declarado indisponível**: a
     `main` só recebe PR mesclado (`CONTRIBUINDO.md`, spec §2).
   - Caminho do PR:
     1. `git push -u origin HEAD:refs/heads/<branch>`;
     2. `gh pr create --base main --head <branch> --title "<tipo>(<NN>): <resumo>" --body "…"`,
        com o body terminando na linha `🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
     3. repetir `gh pr view <n> --json state,mergeable,mergeStateStatus` até `CLEAN`, e
        reportar `gh pr checks <n>` se ficar `BLOCKED` ou `UNSTABLE`.
   - O merge é do João.
   - "Descartar" só com confirmação explícita dele; o `lane.sh fechar --force` é do terminal dele.
   - Reportar o link do PR e que, depois do merge, o próximo é `/finalizar-bloco <NN>` no main
     tree.
8. **Pós-PR** (modo pós-PR), no main tree:
   1. `git merge --ff-only origin/main`;
   2. `bash .claude/scripts/lane.sh fechar <NN>`;
   3. conferir `git worktree list` e `git branch --list <branch>`, os dois sem a lane.

   Nada é escrito nem commitado. Reportar.

Linha final: "O espelho corporativo (`scripts/espelhar-corporativo.sh`) fica fora: é release, não
bloco."

- [ ] **Step 4: Provar que os comandos do main tree passam na allowlist**

```bash
py=.claude/hooks/lib/classificar-comando.py
for c in "git fetch origin" "git merge --ff-only origin/main" "git merge-base --is-ancestor chore/35-x origin/main" \
         "bash .claude/scripts/lane.sh descobrir" "bash .claude/scripts/lane.sh fechar 35" \
         "git worktree list" "git branch --list chore/35-x" "git rev-parse --abbrev-ref HEAD"; do
  out=$(python3 "$py" "$c"); [[ -z $out ]] && echo "LIBERA $c" || echo "NEGA $c"
done
```

Expected: oito `LIBERA`. Se o command ganhou outro comando para o main tree, ele entra nesta lista
e tem de sair `LIBERA`. `NEGA` → trocar o comando; ampliar a allowlist está fora deste bloco.

- [ ] **Step 5: Verificar**

```bash
bash .claude/tests/run-all.sh | grep 'finalizar-bloco:' || echo 'finalizar-bloco limpo'
grep -c 'ff-only\|lane.sh fechar\|sem-arvore\|## Em aberto\|Origin\|Accept\|merge local\|closed' .claude/commands/finalizar-bloco.md
```

Expected: `finalizar-bloco limpo` e contagem ≥ 8.

- [ ] **Step 6: Commit**

```bash
git add .claude/commands/finalizar-bloco.md
git commit -m "feat(35): /finalizar-bloco com registros de fechamento na lane e modos pós-PR e conserto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Demais entradas, plugin e aposentadoria

**Files:**
- Modify: `.claude/commands/revisar-frontend.md` (frontmatter)
- Modify: `.claude/commands/revisar-ui.md` (frontmatter)
- Modify: `.claude/skills/auditar-docs/SKILL.md` (frontmatter)
- Modify: `.claude/skills/lotus-ui-review/SKILL.md` (frontmatter)
- Modify: `.claude/settings.json`
- Delete: `.claude/skills/revisar-sprint/SKILL.md`
- Delete: `.claude/skills/fechar-sprint/SKILL.md`

**Interfaces:**
- Consumes: a Task 3 já destilou o `revisar-sprint`; as Tasks 6 e 7 já portaram o que usavam das
  duas skills.

- [ ] **Step 1: `model`/`effort` nas quatro entradas.** Antes do `---` de fechamento de cada
  frontmatter:

| Arquivo | model | effort |
|---|---|---|
| `.claude/commands/revisar-frontend.md` | sonnet | high |
| `.claude/commands/revisar-ui.md` | sonnet | medium |
| `.claude/skills/auditar-docs/SKILL.md` | sonnet | medium |
| `.claude/skills/lotus-ui-review/SKILL.md` | sonnet | high |

- [ ] **Step 2: Plugin.** Em `.claude/settings.json`, uma chave nova no topo do objeto, antes de
  `"hooks"`:

```json
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true
  },
```

Run: `jq -e '.enabledPlugins["superpowers@claude-plugins-official"]' .claude/settings.json`
Expected: `true`.

- [ ] **Step 3: Aposentar as duas skills**

```bash
git rm -q .claude/skills/revisar-sprint/SKILL.md .claude/skills/fechar-sprint/SKILL.md
ls .claude/skills/
```

Expected: `auditar-docs  lotus-ui-review`.

- [ ] **Step 4: Rodar a catraca**

Run: `bash .claude/tests/run-all.sh | sed -n '/^== commands.tests.sh/,/^== /p'`
Expected: a `FALHA` do `.claude/` real não lista mais entrada, plugin nem skill aposentada. Se as
Tasks 1–7 fecharam, o arquivo sai todo `ok`.

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/revisar-frontend.md .claude/commands/revisar-ui.md \
  .claude/skills/auditar-docs/SKILL.md .claude/skills/lotus-ui-review/SKILL.md .claude/settings.json
git commit -m "chore(35): plugin superpowers no projeto, modelo e esforço nas entradas, revisar-sprint e fechar-sprint aposentadas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Contratos do Codex no estado por bloco

**Files:**
- Modify: `.agents/skills/lotus-context-packet/SKILL.md`
- Modify: `.agents/skills/lotus-execute-block/SKILL.md`
- Modify: `AGENTS.md` (§1, bullet do Context Packet e bullets do estado; §2, bootstrap)

**Interfaces:**
- Produces: o `SUGGESTED_PATH` do packet vira `docs/superpowers/blocos/<NN>-<slug>/context.md`, que
  a Task 4 copia; o `lotus-execute-block` lê o `estado.md` do bloco, que a Task 5 aciona.

- [ ] **Step 1: Inventariar as ocorrências**

Run: `grep -n 'state.md\|active_work_item\|focused_lane\|lanes\|context-packets/\|plans/' .agents/skills/lotus-context-packet/SKILL.md .agents/skills/lotus-execute-block/SKILL.md AGENTS.md`

Expected: as ocorrências listadas no planejamento. `lotus-execute-block` tem 21, 30–31 e 45;
`lotus-context-packet` tem 20, 32, 34, 43, 53, 63, 152, 170–198, 258 e 269; `AGENTS.md` tem §1 e
§2.

- [ ] **Step 2: Reescrever cada ocorrência com esta tabela de troca**

| Antes | Depois |
|---|---|
| `docs/superpowers/state.md` como fonte de estado | `docs/superpowers/blocos/<NN>-<slug>/estado.md`, o do bloco informado pelo chamador. O `state.md` fica citado **só** como contrato |
| `active_work_item` | o bloco (`NN` e slug), informado pelo chamador |
| `SUGGESTED_PATH: docs/superpowers/context-packets/<plan-slug>.md` | `SUGGESTED_PATH: docs/superpowers/blocos/<NN>-<slug>/context.md` |
| `state_path: docs/superpowers/state.md` e o blob SHA do `state.md` na proveniência | `state_path`, o `estado.md` do bloco quando ele já existe; no planejamento o packet nasce **antes** da lane (Task 4), e então `state_path: null` e sem blob |
| "`state.md` está em `context_required`" (AGENTS.md §1) | "o bloco tem `Contexto: sim` no backlog; o `/planejar-bloco` pede o packet antes de abrir a lane" |
| bootstrap item 3 (AGENTS.md §2) | "a saída de `bash .claude/scripts/lane.sh descobrir` e o `estado.md` do bloco da árvore atual — etapa atual e próxima ação permitida; `docs/superpowers/state.md` é o contrato" |
| "Codex pode alterar `docs/superpowers/state.md`, `progress.md`…" | "…o `estado.md` do bloco, `progress.md`…", com as quatro condições intactas |

Os gatilhos de staleness do packet que citam "edit do `state.md`" passam a citar "edit do
`estado.md` do bloco". O resto do contrato (markers, `RECOMMENDED_TRANSITION`, ≤ 8 key facts) não
muda.

- [ ] **Step 3: Verificar**

```bash
grep -n 'state.md' .agents/skills/lotus-context-packet/SKILL.md .agents/skills/lotus-execute-block/SKILL.md AGENTS.md
grep -c 'blocos/<NN>-<slug>' .agents/skills/lotus-context-packet/SKILL.md .agents/skills/lotus-execute-block/SKILL.md
grep -n 'active_work_item\|focused_lane\|lanes:' .agents/skills/*/SKILL.md AGENTS.md || echo 'sem campo antigo'
```

Expected:
- toda linha com `state.md` diz "contrato";
- as duas contagens ≥ 1;
- `sem campo antigo`.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/lotus-context-packet/SKILL.md .agents/skills/lotus-execute-block/SKILL.md AGENTS.md
git commit -m "docs(35): contratos do Codex leem o estado.md do bloco e gravam o packet na pasta dele

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Referências vivas e a régua do harness

**Files:**
- Modify: `docs/superpowers/state.md` (seção Transição, bullet do main tree, invariante 10)
- Modify: `CLAUDE.md` §3 (nota de transição) e §4
- Modify: `docs/superpowers/pendencias/README.md:5`
- Modify: `docs/estrutura-monolito.md` (seção nova antes da de divergências entre planejamento e
  estado real)

**Interfaces:**
- Consumes: os nomes dos quatro commands, `papeis.md` e `prompts/` (Tasks 2–7).

- [ ] **Step 1: `state.md`**
  - Apagar a seção `## Transição` inteira, do título até o fim do arquivo.
  - Na seção `## Lane`, o bullet do main tree passa a ser:

```markdown
- **O main tree fica sempre na `main` e nunca é lane.** Ele planeja, abre e fecha lane
  (`lane.sh abrir` e `lane.sh fechar`) e lê o `backlog.md`. Ele não publica commit: a `main` só
  recebe PR mesclado (`CONTRIBUINDO.md`).
```

  - A invariante 10 passa a ser:

```markdown
10. **`backlog.md` entra na `main` só por PR.** Ficha nova vem numa PR de docs; a lane remove só a
    própria ficha, no commit de fechamento do `/finalizar-bloco`, junto com a linha do
    `historico/progress.md` e o `estado.md` em `closed` (spec do bloco 35, E8). Nenhuma lane
    acrescenta nem edita ficha alheia, e é essa regra que mantém o arquivo livre de conflito.
```

- [ ] **Step 2: `CLAUDE.md`**
  - §3: apagar o bloco `> **Transição até o item 35 mesclar:** …` (três linhas).
  - §4: a linha do ciclo canônico e a seguinte passam a ser:

```markdown
Os quatro commands de bloco são o fluxo, e cada etapa invoca a skill do superpowers por `Skill()`
explícito (plugin `superpowers@claude-plugins-official`, ligado no `.claude/settings.json`):

`/planejar-bloco` (`brainstorming` → `lane.sh abrir` → `writing-plans`) → `/executar-bloco`
(`subagent-driven-development` ou `executing-plans`, com `test-driven-development`) →
`/revisar-bloco` (`requesting-code-review` → `dispatching-parallel-agents` →
`receiving-code-review`) → `/finalizar-bloco` (`verification-before-completion` →
`finishing-a-development-branch`). Modelo e esforço de cada papel despachado: `.claude/papeis.md`.
```

  - §4, tabela: as linhas `/revisar-sprint` e `/fechar-sprint` saem e entram duas:

```markdown
| `/revisar-bloco` | comando | revisão de duas lentes: gabarito do Lotus e verificação de cada achado |
| `/finalizar-bloco` | comando | verificação fresca, registros de fechamento na lane, PR; depois do merge, fecha a lane |
```

  - §4: "Planos/specs ativos em `docs/superpowers/`; concluídos em `plans/archive/` e
    `specs/archive/`." passa a ser "Bloco novo: spec, plano, revisão e rulings em
    `docs/superpowers/blocos/<NN>-<slug>/`. `specs/` e `plans/` guardam o legado e as specs
    compartilhadas."

- [ ] **Step 3: `pendencias/README.md`**, linha 5: "Revisada a cada `/fechar-sprint`." passa a
  ser "Revisada a cada `/finalizar-bloco`."

- [ ] **Step 4: `estrutura-monolito.md`**, seção nova `## HARNESS — \`.claude/\` e \`.agents/\``.
  Conteúdo, medido no código, sem copiar desta lista:
  - Árvore comentada, uma linha por item:
    - `commands/`: os quatro de bloco, mais `revisar-frontend` e `revisar-ui`;
    - `agents/`: papéis, com a regra de `papeis.md`;
    - `hooks/`: os cinco e o que cada um nega ou cobra, lendo o cabeçalho de cada `.sh`, mais
      `lib/`;
    - `scripts/`: `lane.sh` e os verbos;
    - `prompts/`;
    - `rules/`, que carrega por caminho;
    - `skills/`;
    - `tests/`: `run-all.sh`, a trava de avulso e a lição 10;
    - `settings.json`: hooks e o plugin;
    - `papeis.md`;
    - `.agents/skills/` para o Codex.
  - **A régua da allowlist do `guard-main-shell`:**
    - onde mora: `.claude/hooks/lib/classificar-comando.py`, com as famílias `familia_*`,
      `GIT_SUB` e `NEGADOS_SEMPRE`;
    - o que ela libera na `main`: leitura, verificação e o `lane.sh` nas quatro formas;
    - como acrescentar uma entrada: editar a família ou o conjunto, acrescentar os casos que
      liberam **e** os que negam em `.claude/tests/classificar-comando.tests.sh`, e rodar
      `bash .claude/tests/run-all.sh`;
    - o `guard-main` libera escrita na `main` só em `docs/`, `.claude/`, `.agents/` e nos arquivos
      raiz listados em `.claude/hooks/guard-main.sh`.

- [ ] **Step 5: Verificar**

```bash
grep -n 'revisar-sprint\|fechar-sprint' CLAUDE.md docs/superpowers/pendencias/README.md docs/superpowers/state.md || echo 'sem entrada aposentada'
grep -n 'Transição' docs/superpowers/state.md CLAUDE.md || echo 'sem transição'
grep -c 'classificar-comando.py\|papeis.md\|lane.sh\|settings.json' docs/estrutura-monolito.md
bash .claude/tests/run-all.sh | tail -1
```

Expected:
- `sem entrada aposentada`;
- `sem transição`;
- contagem ≥ 4;
- a última linha do `run-all` segue o estado da Task 8. O `estados.tests.sh` lê a tabela do
  `state.md` e tem de continuar `ok`.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/state.md CLAUDE.md docs/superpowers/pendencias/README.md docs/estrutura-monolito.md
git commit -m "docs(35): state.md sem transição e com a invariante 10 do E8, CLAUDE.md com os quatro commands, estrutura do harness documentada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: DoD, metade catraca — verde, e vermelha nos dois sentidos no `.claude/` real

**Files:**
- Create: `docs/superpowers/blocos/35-harness-commands-de-bloco/prova-catraca.md`

- [ ] **Step 1: Verde**

Run: `bash .claude/tests/run-all.sh | tail -1`
Expected: `OK: <n> arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 2: Vermelho ao apagar `Skill(superpowers:brainstorming)`, e verde de volta.** A cópia
  de segurança vai para o scratchpad; `git stash` é proibido (memória do projeto).

```bash
bak=$(mktemp "${TMPDIR:-/tmp}/lotus-prova-35.XXXXXX")
cp .claude/commands/planejar-bloco.md "$bak"
sed -i '/Skill(superpowers:brainstorming)/d' .claude/commands/planejar-bloco.md
bash .claude/tests/run-all.sh | grep -E 'FALHA|sem Skill|^FALHOU|^OK'
cp "$bak" .claude/commands/planejar-bloco.md && rm "$bak"
git diff --exit-code .claude/commands/planejar-bloco.md && bash .claude/tests/run-all.sh | tail -1
```

Expected:
- `FALHA o .claude/ real passa na catraca dos commands`,
  `planejar-bloco: sem Skill(superpowers:brainstorming)` e `FALHOU: 1 asercao(oes)`;
- depois do restauro, diff vazio e `OK: …`.

- [ ] **Step 3: O mesmo com um `model:`**, apagando a linha `^model:` de
  `.claude/commands/executar-bloco.md`. Expected: `executar-bloco: model [], esperado sonnet` e
  `FALHOU`; depois do restauro, `OK`.

- [ ] **Step 4: Registrar.** `prova-catraca.md` traz:
  - a data e o SHA do `HEAD`;
  - os três comandos de cada sentido;
  - a saída real, recortada nas linhas do Expected.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/blocos/35-harness-commands-de-bloco/prova-catraca.md
git commit -m "test(35): catraca verde e vermelha nos dois sentidos contra o .claude/ real

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: DoD, metade clone — `/planejar-bloco` e `/executar-bloco` de verdade (E4.2)

**Files:**
- Create: `docs/superpowers/blocos/35-harness-commands-de-bloco/prova-clone.md`

> **Task com o João.** Os commands só rodam numa sessão aberta no clone, e a sessão desta lane não
> escreve git fora da própria worktree. O controlador prepara os comandos exatos, o João roda o
> preparo e as duas sessões, e o controlador lê a evidência e grava o registro.

- [ ] **Step 1: Preparo**, rodado pelo João no terminal. `S` é um diretório descartável, por
  exemplo `S=$(mktemp -d /tmp/lotus-prova-35.XXXXXX)`.

```bash
git clone -q /home/jvbat/projetos/lotus "$S/lotus"
cd "$S/lotus"
git config core.hooksPath .githooks
git merge -q --no-ff origin/chore/35-harness-commands-de-bloco -m "prova: ponta do 35 na main do clone"
cp /home/jvbat/projetos/lotus/.env .env 2>/dev/null
cp /home/jvbat/projetos/lotus/backend/.env backend/.env
cp /home/jvbat/projetos/lotus/frontend/.env frontend/.env
cat >> docs/superpowers/backlog.md <<'EOF'

---

## 99. `demo-harness`

**Prioridade:** P3 · **Frente:** Harness · **Contexto:** não · **Depende:** —
**Fonte:** prova do DoD do item 35 (E4.2), só no clone descartável.

**Objetivo:** criar `docs/demo-harness.md` com a linha `prova do harness de blocos`.

**DoD:** o arquivo existe com a linha; `grep -c 'prova do harness de blocos' docs/demo-harness.md` sai `1`.
EOF
git add docs/superpowers/backlog.md && git commit -qm "prova: ficha 99 no clone"
```

- [ ] **Step 2: Sessão de planejamento**, pelo João, em `$S/lotus`:
  - `claude`;
  - aceitar a instalação do plugin `superpowers@claude-plugins-official` quando o Claude Code
    oferecer (é o `enabledPlugins` do projeto);
  - `/planejar-bloco 99`;
  - aprovar o design, a spec e o plano.

  Esperado:
  - o `lane.sh abrir` cria `$S/lotus-99-demo-harness`;
  - o `EnterWorktree` entra nela;
  - `estado.md` em `ready_for_execution`.

  **Não subir stack** no clone: o offset dele é contado só entre as árvores do clone e pode
  colidir com as lanes reais.

- [ ] **Step 3: Sessão de execução**, pelo João, em `$S/lotus-99-demo-harness`: `claude` e depois
  `/executar-bloco 99`. Esperado: `estado.md` em `ready_for_review`, com `rulings.md`.

- [ ] **Step 4: Evidência**, lida pelo controlador

```bash
for d in "$S/lotus" "$S/lotus-99-demo-harness"; do
  p=~/.claude/projects/$(printf '%s' "$d" | sed 's|[/.]|-|g')
  grep -rhoE '"skill":"[^"]+"' "$p" | sort | uniq -c
done
git -C "$S/lotus-99-demo-harness" log --oneline main..HEAD
git -C "$S/lotus-99-demo-harness" log -p --format='== %h %s' -- docs/superpowers/blocos/99-demo-harness/estado.md | grep -E '^== |^[+-](workflow_state|next_action|efeito_externo|executor):'
```

Expected:
- as invocações de `Skill` com `caveman`, `superpowers:brainstorming` e
  `superpowers:writing-plans`;
- `superpowers:executing-plans` ou `superpowers:subagent-driven-development`;
- `superpowers:test-driven-development`, que pode estar no transcript de um subagente, sob a
  mesma pasta;
- a cadeia `planning` → `ready_for_execution` → `executing` → `ready_for_review` no
  `estado.md`, com os tokens certos.

Invocação faltando → o command não força a Skill: volta para a Task 4 ou 5 e corrige.

- [ ] **Step 5: Registrar** em `prova-clone.md`:
  - data e SHA da ponta do 35 usada;
  - os comandos do preparo;
  - a saída do Step 4, recortada;
  - o que o João viu de diferente do esperado.

- [ ] **Step 6: Limpar**, pelo João: `rm -rf "$S"`. Nenhum contêiner subiu. As pastas de
  transcript em `~/.claude/projects` ficam.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/blocos/35-harness-commands-de-bloco/prova-clone.md
git commit -m "test(35): /planejar-bloco e /executar-bloco vistos rodar num clone descartável

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Depois do plano (fora das tasks)

A metade E4.3 do DoD é o próprio fluxo, e não uma task. Quando o `/executar-bloco` antigo leva o
35 a `ready_for_review`, o João abre uma sessão **na lane**, onde os commands novos carregam, e
roda `/revisar-bloco 35` e depois `/finalizar-bloco 35`, que abre o PR real. Depois do merge,
roda `/finalizar-bloco 35` no main tree, e o modo pós-PR fecha a lane. O `revisao.md` e o PR são a
evidência dessa metade.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 2, 3, 9 | sim | nenhuma entre elas: a 3 lê o `revisar-sprint`, que nenhuma das três toca |
| G2 | 4, 5, 6, 7 | sim | nenhuma entre elas; todas consomem as Tasks 2, 3 e 9, que vêm antes |

Tasks fora de grupo executam e revisam uma a uma:
- a 1 vem antes de tudo;
- a 8 depois da 3 (apaga o que a 3 lê) e das 6 e 7 (que portam as skills aposentadas);
- a 10 depois do G2;
- as 11 e 12 no fim.

Ordem: 1 → G1 → G2 → 8 → 10 → 11 → 12.

## Handoff de execução

```yaml
executor: claude
sessao: opus / high
skill: superpowers:subagent-driven-development   # 12 tasks, 25+ arquivos
executado_por: /executar-bloco antigo (E4.1); o novo é o produto do bloco
```

- **Despachos.** Os agentes de papel nascem na Task 2 e não carregam no meio da sessão, então os
  despachos usam `general-purpose` com `model` explícito:
  - implementador `sonnet`: Tasks 1, 2, 3, 8, 9 e 11, mecânicas, com o conteúdo pronto no plano;
  - implementador `sonnet`, com o controlador revisando de perto: Tasks 4, 5, 6, 7 e 10, texto
    escrito a partir de fontes;
  - revisor de task `sonnet`; revisor final da branch `opus`.

  O esforço por despacho não se aplica (é a limitação que a Task 2 resolve).
- **Task 12:** controlador e João, sem subagente.
- **`paths_autorizados`:** não se aplica (`executor: claude`).
- **Efeito externo:** nenhum (`efeito_externo: nao`, spec `## Verificação externa`).
- **Ação do João fora do DoD (E6):** remover os symlinks de `~/.claude/skills` que apontam para
  `~/.claude/plugins/superpowers` (v6.1.1).
