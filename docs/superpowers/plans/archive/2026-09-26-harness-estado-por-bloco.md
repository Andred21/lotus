# Harness — estado por bloco e `lane.sh` (item 30) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar o estado das lanes do `state.md` central e pô-lo na pasta de cada bloco, com um `lane.sh` que descobre, abre (atrás de um portão), confere e fecha lanes, e um `SessionStart` que lê o estado dali.

**Architecture:** `.claude/scripts/lane.sh` é bash puro sobre `git worktree list`; a lógica que não cabe em bash mora em dois módulos Python sem efeito colateral — `hooks/lib/ler-frontmatter.py` (campos de um frontmatter numa linha separada por US) e `scripts/lib/backlog.py` (fichas e fecho de dependência). `hooks/lib/estados.sh` guarda o mapa estado → token uma vez só e a regra de coerência de um `estado.md`. O `session-start.sh` passa a consumir `lane.sh descobrir`; o `classificar-comando.py` ganha a única porta de `bash` na `main`, por forma exata. A última task é a virada: `state.md` vira contrato e o registro do 30 migra para `blocos/30-harness-estado-por-bloco/estado.md`.

**Tech Stack:** bash 5 (WSL), `git` 2.43, `python3` da distribuição (stdlib + PyYAML 6.0.1), `jq`, Docker Compose v5 e pnpm 11 (só na prova da Task 9).

**Spec:** [`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md`](../specs/2026-09-26-harness-paridade-eladecora-design.md) — §3 (arquitetura de estado), §4 (este item) e §7 (a ponte manual).

## Global Constraints

- Nenhuma dependência nova. Python só com stdlib e PyYAML 6.0.1, já instalado; `yaml.load(..., Loader=yaml.BaseLoader)`, nunca `safe_load`, para os escalares saírem como escritos.
- Separador de campo entre Python e bash é o **Unit Separator (0x1F)**, nunca TAB: TAB é espaço em branco para o `IFS` e colapsa campo vazio.
- `lane.sh`: toda recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, `exit 1`, **antes** de criar ou destruir qualquer coisa. Sem `set -e`: cada passo que cria confere o próprio código.
- `docker` e `pnpm` entram no `lane.sh` só por `LANE_DOCKER` e `LANE_PNPM` (default `docker` e `pnpm`). A suíte nunca sobe contêiner nem baixa pacote.
- Branch de lane: `^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$`. `NN` de argumento: `^[1-9][0-9]*$`. Slug: `^[a-z0-9]+(-[a-z0-9]+)*$`. Alias de modelo: `^[a-z0-9.-]+$`.
- Offsets: HTTP 8080+o, DB 3307+o, Mailpit 8025+o, MinIO 9000+2o e 9001+2o, Vite 5173+o. Lanes em +1, +2, +3; teto de três lanes.
- `updated_by` = `<id -un>@<hostname -s> / <alias>`; sem `--modelo`, o alias é `terminal`.
- Mensagens e comentários dos scripts em ASCII (sem acento), como os hooks do item 28.
- Nada nos testes toca o repositório real. Nada de `git stash` — a pilha tem stashes alheios; catraca se prova com cópia (`cp`) no scratchpad.
- Toda catraca é vista reprovar antes de ser dada como fechada (lição 10).
- O veredito da suíte é a **última linha** do `run-all.sh`. O `_assert.tests.sh` imprime de propósito uma linha `FALHA …/ruim.sh saiu com codigo 3 (contrato exige 0)` que não conta; "nenhuma `FALHA`" nos Expected abaixo quer dizer nenhuma além dela.
- **Ponte (spec §7):** as Tasks 1–9 rodam no fluxo antigo, com a `lane-a` do `state.md`, e **não tocam o `state.md`**. A Task 10 é a virada, num commit só. Depois dela o estado do 30 vive em `docs/superpowers/blocos/30-harness-estado-por-bloco/estado.md`, e o passo do `/executar-bloco` antigo que grava `ready_for_review` no `state.md` não se aplica: a própria Task 10 grava.
- Árvore de trabalho: `../lotus-harness`, branch `chore/30-harness-estado-por-bloco`, aberta de `origin/main@65d81bc9`.
- Commits no estilo do harness: `feat(harness): ...`, `test(harness): ...`, ASCII, com a linha `Co-Authored-By` do ambiente.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `.claude/hooks/lib/ler-frontmatter.py` | campos pedidos de um frontmatter YAML, numa linha separada por US. Substitui o `ler-estado.py` |
| `.claude/scripts/lane.sh` | os quatro verbos: `descobrir`, `abrir`, `conferir`, `fechar` |
| `.claude/scripts/lib/backlog.py` | ficha do `backlog.md` (slug e `**Depende:**`) e conflito de dependência transitivo |
| `.claude/hooks/lib/estados.sh` | mapa estado → token, régua de fase e `coerencia_da_lane` |
| `.claude/hooks/session-start.sh` | relata lanes, órfãs, fechamento interrompido e incoerência da lane da sessão |
| `.claude/hooks/lib/classificar-comando.py` | ganha `familia_lane`: a única forma de `bash` liberada na `main` |
| `.claude/tests/_lane.sh` | ajudantes dos testes do `lane.sh` (main tree descartável com pai próprio, falsos de `docker`/`pnpm`) |
| `.claude/tests/lane-*.tests.sh` | um por verbo |
| `.claude/tests/ler-frontmatter.tests.sh` | o leitor de frontmatter |
| `.claude/tests/estados.tests.sh` | coerência de `estado.md` e a catraca tabela do `state.md` × `estados.sh` |
| `.env.example` | a linha +3 da tabela de offsets |
| `docs/superpowers/state.md` | vira contrato: estados, tokens, campos, invariantes |
| `docs/superpowers/blocos/30-harness-estado-por-bloco/estado.md` | o estado do 30 depois da virada |

---

### Task 1: `ler-frontmatter.py`

**Files:**
- Create: `.claude/hooks/lib/ler-frontmatter.py`
- Test: `.claude/tests/ler-frontmatter.tests.sh`

**Interfaces:**
- Consumes: `DIR_HOOKS`, `assert_igual`, `registrar_descarte`, `FALHAS_TESTE` do `_assert.sh`.
- Produces: `python3 .claude/hooks/lib/ler-frontmatter.py <arquivo> <campo>...` → **uma** linha com os valores na ordem pedida, separados por `\x1f`. `null`, `~`, vazio, campo ausente e valor não escalar viram vazio; quebra de linha e US dentro de valor viram espaço, com `strip()`. Arquivo ausente, sem frontmatter, frontmatter que não é mapa ou YAML inválido: nada no stdout. Sempre `exit 0`.

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/ler-frontmatter.tests.sh`:

```bash
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
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em `== ler-frontmatter.tests.sh` — toda asserção com valor esperado não vazio reprova (`python3: can't open file`); as de "nada" passam por acidente, e é por isso que elas sozinhas não provam nada.

- [ ] **Step 3: Implementar**

Crie `.claude/hooks/lib/ler-frontmatter.py`:

```python
#!/usr/bin/env python3
"""Le campos do frontmatter YAML de um arquivo markdown, numa linha so.

Contrato:
  argv[1]    caminho do arquivo
  argv[2..]  nomes de campo
  stdout     UMA linha com os valores na ordem pedida, separados pelo Unit
             Separator do ASCII (0x1F). `null`, `~`, valor vazio, campo
             ausente e valor que nao e escalar (lista, mapa) viram vazio.
             Quebra de linha e US dentro de valor viram espaco, para a
             linha continuar uma so.
  exit 0     sempre. Arquivo ausente, sem frontmatter, frontmatter que nao
             e mapa ou YAML invalido emitem nada: quem chama nao distingue
             os casos, e nao precisa.

Os escalares saem como estao escritos (BaseLoader): `updated_at` nao vira
datetime, `offset: 1` nao vira int e `efeito_externo: nao` nao vira False.

O separador NAO e TAB. TAB e espaco em branco para o IFS do bash, e espaco
em branco COLAPSA: uma sequencia de TABs vira um separador so, entao um
campo vazio no meio da linha empurra todos os campos seguintes uma casa para
a esquerda. Foi o que aconteceu com o ler-estado.py, que este arquivo
substitui: com `active_work_item: null` na lane-c do state.md real, o
`session-start.sh` recebia a branch no lugar do item, o caminho da arvore no
lugar da branch e o next_action no lugar da arvore — e a comparacao daquela
lane era pulada em silencio. O Unit Separator nao e espaco em branco para o
IFS, entao campo vazio sobrevive na posicao dele.
"""

import re
import sys

import yaml

SEP = "\x1f"
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---[ \t]*(?:\n|\Z)", re.S)
NULOS = {"", "null", "Null", "NULL", "~"}


def main(argv):
    if len(argv) < 3:
        return 0
    try:
        with open(argv[1], encoding="utf-8") as f:
            texto = f.read()
    except OSError:
        return 0
    m = FRONTMATTER.match(texto)
    if not m:
        return 0
    try:
        dados = yaml.load(m.group(1), Loader=yaml.BaseLoader)
    except yaml.YAMLError:
        return 0
    if not isinstance(dados, dict):
        return 0
    valores = []
    for campo in argv[2:]:
        v = dados.get(campo)
        if not isinstance(v, str) or v in NULOS:
            v = ""
        valores.append(v.replace("\n", " ").replace(SEP, " ").strip())
    sys.stdout.write(SEP.join(valores) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== ler-frontmatter.tests.sh` com 15 linhas `ok`, nenhuma `FALHA`, e a última linha `OK: 8 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/ler-frontmatter.py .claude/tests/ler-frontmatter.tests.sh
git commit -m "feat(harness): leitor de frontmatter por campo, com US e escalares crus"
```

---

### Task 2: `lane.sh` — esqueleto e `descobrir`

**Files:**
- Create: `.claude/scripts/lane.sh`
- Create: `.claude/tests/_lane.sh`
- Test: `.claude/tests/lane-descobrir.tests.sh`

**Interfaces:**
- Consumes: `raiz_de`, `branch_de` de `.claude/hooks/lib/comum.sh`; `ler-frontmatter.py` (Task 1).
- Produces (`lane.sh`): `bash .claude/scripts/lane.sh descobrir` → uma linha por achado, campos separados por `\x1f`: `lane␟NN␟workflow_state␟branch␟arvore␟next_action␟offset`, `orfa␟arvore␟branch` (`branch` = `(detached)` quando destacada), `sem-arvore␟NN␟branch`. O main tree nunca aparece. `NN` sai sem zero à esquerda. Funções internas que as Tasks 3–6 usam: `recusar motivo`, `emitir campo...`, `carregar_arvores caminho` (preenche `ARV_CAMINHO`/`ARV_BRANCH`, índice 0 = main tree), `raiz_ou_recusa` (define `RAIZ` e `PRINCIPAL`), `exigir_main_tree verbo`, `lanes_vivas` (emite `NN␟arvore␟branch`), `estado_da_lane arvore branch`; constantes `PADRAO_LANE`, `PADRAO_NN`, `PADRAO_SLUG`, `PADRAO_ALIAS`, `TIPOS`, `TETO_LANES`, `SEP`, `DOCKER`, `PNPM`, `LER_FM`, `BACKLOG_PY`.
- Produces (`_lane.sh`): `LANE_SH`, `LER_FM_TESTE`, `REAL_ENV_EXAMPLE`, `US`; `criar_main_lane` (ecoa o main tree `<pai>/lotus`; o chamador registra `dirname`), `escrever_backlog raiz`, `rodar_lane dir args...` (seta `SAIDA_LANE` com stdout+stderr e `CODIGO_LANE`; `LANE_PNPM=${FAKE_PNPM:-true}`, `LANE_DOCKER=${FAKE_DOCKER:-true}`), `lane_manual main branch` (worktree irmã `lotus-<branch sem tipo>`, ecoa o caminho), `escrever_estado_lane arvore pasta ws next_action branch [linha-extra...]` (escreve `offset: 1`), `linha_com_prefixo texto prefixo`.

- [ ] **Step 1: Escrever os ajudantes de teste**

Crie `.claude/tests/_lane.sh`:

```bash
# Ajudantes dos testes do lane.sh. Sourceado pelos *.tests.sh que precisam;
# nao e teste (o run-all.sh so pega *.tests.sh).

LANE_SH="$DIR_TESTES/../scripts/lane.sh"
LER_FM_TESTE="$DIR_HOOKS/lib/ler-frontmatter.py"
REAL_ENV_EXAMPLE="$DIR_TESTES/../../.env.example"
US=$'\x1f'

escrever_backlog() {
  # $1 = raiz. 30-33 imitam a cadeia real da paridade; 40 nao declara
  # Depende; 41-43 sao livres, para encher o teto.
  mkdir -p "$1/docs/superpowers"
  cat > "$1/docs/superpowers/backlog.md" <<'BACKLOG'
# Backlog — teste

## 30. `harness-estado-por-bloco`

**Prioridade:** P1 · **Frente:** Harness · **Contexto:** não · **Depende:** —

Escopo: o portao le a linha **Depende:** da ficha. Esta frase cita **Depende:** 33 e nao
e declaracao.

## 31. `harness-commands-de-bloco`

**Prioridade:** P1 · **Frente:** Harness · **Depende:** 30

## 32. `harness-aceitacao-externa`

**Prioridade:** P1 · **Frente:** Harness · **Depende:** 31

## 33. `harness-sinal-de-contexto-cheio`

**Prioridade:** P3 · **Frente:** Harness · **Depende:** —

## 40. `ficha-sem-depende`

**Prioridade:** P2 · **Frente:** Backend · **Contexto:** não

## 41. `livre-a`

**Prioridade:** P2 · **Frente:** Backend · **Depende:** —

## 42. `livre-b`

**Prioridade:** P2 · **Frente:** Frontend · **Depende:** —

## 43. `livre-c`

**Prioridade:** P2 · **Frente:** Infra · **Depende:** —

## Agrupados em bloco

Texto que nao e ficha.
BACKLOG
}

criar_main_lane() {
  # Main tree descartavel DENTRO de um diretorio pai proprio, porque as lanes
  # nascem como irmas (../lotus-<NN>-<slug>) e nao podem cair no TMPDIR
  # compartilhado. Ecoa o main tree; o chamador registra o descarte do PAI:
  #   _m=$(criar_main_lane); registrar_descarte "$(dirname "$_m")"
  # Mesma trava do criar_repo: sem pai, aborta sem ecoar caminho, porque
  # `git -C ""` cai no diretorio atual, que e o repo real.
  local pai raiz
  pai=$(mktemp -d "${TMPDIR:-/tmp}/lotus-lane-teste.XXXXXX") || pai=''
  if [[ -z $pai || ! -d $pai ]]; then
    printf 'ABORTADO: nao consegui criar pai descartavel; nao vou rodar git contra o repo real\n' >&2
    exit 1
  fi
  pai=$(realpath "$pai")
  raiz="$pai/lotus"
  mkdir -p "$raiz/backend" "$raiz/frontend"
  git -C "$raiz" init -q -b main
  git -C "$raiz" config user.email harness@lotus.local
  git -C "$raiz" config user.name 'Harness de teste'
  cp "$REAL_ENV_EXAMPLE" "$raiz/.env.example"
  printf '%s\n' '/.env*' '!/.env.example' '/backend/.env*' '/frontend/.env*' \
    '/frontend/node_modules' '/backend/vendor' > "$raiz/.gitignore"
  printf '{"name":"teste"}\n' > "$raiz/frontend/package.json"
  : > "$raiz/backend/.gitkeep"
  escrever_backlog "$raiz"
  git -C "$raiz" add -A
  git -C "$raiz" commit -q -m base
  # Os .env do main tree sao ignorados, como no repositorio real.
  printf 'APP_KEY=base64:teste\n' > "$raiz/backend/.env"
  printf 'VITE_ALGO=1\nVITE_API_URL=http://localhost:8080\n' > "$raiz/frontend/.env"
  printf '%s\n' "$raiz"
}

rodar_lane() {
  # $1 = diretorio de onde rodar; o resto vai para o lane.sh. Seta SAIDA_LANE
  # (stdout e stderr juntos) e CODIGO_LANE. pnpm e docker sao `true` por
  # padrao; FAKE_PNPM e FAKE_DOCKER, passados na frente da chamada, trocam.
  local dir=$1
  shift
  SAIDA_LANE=$(cd "$dir" && LANE_PNPM=${FAKE_PNPM:-true} LANE_DOCKER=${FAKE_DOCKER:-true} \
    bash "$LANE_SH" "$@" 2>&1)
  CODIGO_LANE=$?
}

lane_manual() {
  # $1 = main tree, $2 = branch. Worktree irma sem passar pelo abrir, para
  # montar cenario. Ecoa o caminho.
  local arv
  arv="$(dirname "$1")/lotus-${2#*/}"
  git -C "$1" worktree add -q -b "$2" "$arv" main >/dev/null 2>&1
  printf '%s\n' "$arv"
}

escrever_estado_lane() {
  # $1 arvore, $2 pasta (NN-slug), $3 workflow_state, $4 next_action,
  # $5 branch; $6.. linhas extras do frontmatter ('active_plan: x').
  local arv=$1 pasta=$2 ws=$3 na=$4 br=$5
  shift 5
  mkdir -p "$arv/docs/superpowers/blocos/$pasta"
  {
    printf -- '---\nschema_version: 3\nid: %s\nslug: %s\n' "${pasta%%-*}" "$pasta"
    printf 'workflow_state: %s\nnext_action: %s\nbranch: %s\noffset: 1\n' "$ws" "$na" "$br"
    (( $# > 0 )) && printf '%s\n' "$@"
    printf -- '---\n'
  } > "$arv/docs/superpowers/blocos/$pasta/estado.md"
}

linha_com_prefixo() {
  # $1 = texto, $2 = prefixo. Ecoa a primeira linha que comeca com o prefixo.
  printf '%s\n' "$1" | awk -v p="$2" 'index($0, p) == 1 { print; exit }'
}
```

- [ ] **Step 2: Escrever o teste do `descobrir`**

Crie `.claude/tests/lane-descobrir.tests.sh`:

```bash
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
```

- [ ] **Step 3: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em `== lane-descobrir.tests.sh` — `CODIGO_LANE` sai 127 (`lane.sh: No such file or directory`) e toda linha esperada vem vazia.

- [ ] **Step 4: Implementar o esqueleto e o `descobrir`**

Crie `.claude/scripts/lane.sh`:

```bash
#!/usr/bin/env bash
# Descobre, abre, confere e fecha lanes do harness de blocos
# (spec 2026-09-26-harness-paridade-eladecora-design.md, §3.2 e §4.1).
#
# Uma lane e uma worktree irma numa branch <tipo>/<NN>-<resto>. O main tree
# fica na main e nunca e lane. O estado de cada lane mora em
# docs/superpowers/blocos/<NN>-<resto>/estado.md, na arvore da propria lane.
#
# Contrato: toda recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, com
# exit 1, ANTES de criar ou destruir qualquer coisa. Sem `set -e`: cada passo
# que cria confere o proprio codigo, para a mensagem de falha poder dizer o
# que ja existe no disco. `docker` e `pnpm` entram por LANE_DOCKER e
# LANE_PNPM, para a suite nao subir conteiner nem baixar pacote.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/../hooks/lib/comum.sh"

LER_FM="$DIR/../hooks/lib/ler-frontmatter.py"
BACKLOG_PY="$DIR/lib/backlog.py"
DOCKER=${LANE_DOCKER:-docker}
PNPM=${LANE_PNPM:-pnpm}
PADRAO_LANE='^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$'
PADRAO_NN='^[1-9][0-9]*$'
PADRAO_SLUG='^[a-z0-9]+(-[a-z0-9]+)*$'
PADRAO_ALIAS='^[a-z0-9.-]+$'
TIPOS='feat fix chore refactor infra cicd docs'
TETO_LANES=3
# Unit Separator (0x1F), nao TAB: ver o docstring do ler-frontmatter.py.
SEP=$'\x1f'

recusar() {
  printf 'PORTAO RECUSOU: %s\n' "$1" >&2
  exit 1
}

emitir() {
  local IFS=$SEP
  printf '%s\n' "$*"
}

carregar_arvores() {
  # $1 = qualquer caminho do repositorio. Preenche ARV_CAMINHO e ARV_BRANCH na
  # ordem do `git worktree list`: o indice 0 e sempre o main tree.
  ARV_CAMINHO=()
  ARV_BRANCH=()
  local linha cam='' br=''
  while IFS= read -r linha; do
    case $linha in
      'worktree '*) cam=${linha#worktree }; br='(detached)' ;;
      'branch refs/heads/'*) br=${linha#branch refs/heads/} ;;
      '') [[ -n $cam ]] && { ARV_CAMINHO+=("$cam"); ARV_BRANCH+=("$br"); cam=''; } ;;
    esac
  done < <(git -C "$1" worktree list --porcelain 2>/dev/null; printf '\n')
}

raiz_ou_recusa() {
  RAIZ=$(raiz_de "$PWD")
  [[ -n $RAIZ ]] || recusar "fora de um repositorio git ($PWD)"
  carregar_arvores "$RAIZ"
  PRINCIPAL=${ARV_CAMINHO[0]}
}

exigir_main_tree() {
  # $1 = verbo, para a mensagem.
  [[ $(realpath -m "$RAIZ") == "$(realpath -m "$PRINCIPAL")" ]] \
    || recusar "$1 roda no main tree ($PRINCIPAL), e esta arvore e $RAIZ"
  local br
  br=$(branch_de "$RAIZ")
  [[ $br == main ]] || recusar "$1 exige o main tree na main, e ele esta em $br"
}

lanes_vivas() {
  # NN<US>arvore<US>branch por worktree que casa o padrao, fora o main tree.
  local i
  for i in "${!ARV_CAMINHO[@]}"; do
    (( i == 0 )) && continue
    [[ ${ARV_BRANCH[$i]} =~ $PADRAO_LANE ]] || continue
    emitir "$((10#${BASH_REMATCH[2]}))" "${ARV_CAMINHO[$i]}" "${ARV_BRANCH[$i]}"
  done
}

estado_da_lane() {
  # $1 = arvore, $2 = branch. A pasta do bloco e a branch sem o tipo.
  printf '%s/docs/superpowers/blocos/%s/estado.md' "$1" "${2#*/}"
}

verbo_descobrir() {
  (( $# == 0 )) || recusar "uso: lane.sh descobrir"
  raiz_ou_recusa
  local i cam br nn ws na off ref
  for i in "${!ARV_CAMINHO[@]}"; do
    (( i == 0 )) && continue
    cam=${ARV_CAMINHO[$i]}
    br=${ARV_BRANCH[$i]}
    if [[ $br =~ $PADRAO_LANE ]]; then
      nn=$((10#${BASH_REMATCH[2]}))
      ws=''; na=''; off=''
      IFS=$SEP read -r ws na off < <(python3 "$LER_FM" \
        "$(estado_da_lane "$cam" "$br")" workflow_state next_action offset)
      emitir lane "$nn" "$ws" "$br" "$cam" "$na" "$off"
    else
      emitir orfa "$cam" "$br"
    fi
  done
  # Branch de lane sem worktree: a assinatura de fechamento interrompido. A
  # do main tree entra na lista de "tem worktree" como qualquer outra.
  while IFS= read -r ref; do
    [[ $ref =~ $PADRAO_LANE ]] || continue
    nn=$((10#${BASH_REMATCH[2]}))
    printf '%s\n' "${ARV_BRANCH[@]}" | grep -qxF -- "$ref" && continue
    emitir sem-arvore "$nn" "$ref"
  done < <(git -C "$RAIZ" for-each-ref --format='%(refname:short)' refs/heads/)
}

verbo=${1:-}
(( $# > 0 )) && shift
case $verbo in
  descobrir) verbo_descobrir "$@" ;;
  *) recusar "verbo '$verbo' desconhecido; use descobrir, abrir, conferir ou fechar" ;;
esac
```

- [ ] **Step 5: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== lane-descobrir.tests.sh` com 16 linhas `ok`, nenhuma `FALHA`; `OK: 9 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 6: Conferir no repositório real (somente leitura)**

Run: `bash .claude/scripts/lane.sh descobrir | cat -v`
Expected: `lane^_30^_^_chore/30-harness-estado-por-bloco^_/home/jvbat/projetos/lotus-harness^_^_` (o 30 ainda não tem `estado.md`) e uma linha `orfa^_…` para cada uma de `fix-frontend`, `lotus-infra` e `lotus-preview`. Nenhuma linha do main tree.

- [ ] **Step 7: Commit**

```bash
git add .claude/scripts/lane.sh .claude/tests/_lane.sh .claude/tests/lane-descobrir.tests.sh
git commit -m "feat(harness): lane.sh descobre lanes pelo worktree list e pelo estado.md de cada uma"
```

---

### Task 3: `lane.sh abrir` — o portão

**Files:**
- Create: `.claude/scripts/lib/backlog.py`
- Modify: `.claude/scripts/lane.sh`
- Modify: `.claude/tests/_lane.sh`
- Test: `.claude/tests/lane-abrir.tests.sh`

**Interfaces:**
- Consumes: de `lane.sh` (Task 2) `recusar`, `raiz_ou_recusa`, `exigir_main_tree`, `lanes_vivas`, `ARV_CAMINHO`, `PRINCIPAL`, `RAIZ`, `SEP`, os `PADRAO_*`, `TIPOS`, `TETO_LANES`, `BACKLOG_PY`; de `_lane.sh` `criar_main_lane`, `rodar_lane`, `lane_manual`, `US`.
- Produces (`backlog.py`): `python3 backlog.py ficha <backlog> <NN>` → `slug␟deps`, com `deps` = números separados por espaço, vazio quando a ficha declara `—`, ou `SEM-DEPENDE` quando a primeira linha `**Prioridade:**` da ficha não tem `**Depende:**`; ficha inexistente → nada. `python3 backlog.py conflito <backlog> <NN> [<NN vivo>...]` → uma linha por lane viva que cruza a dependência, em qualquer sentido, transitivamente (`"<NN> depende de <X>, que tem lane viva"`, `"a lane viva <X> depende de <NN>"`, `"a ficha <NN> ja tem lane viva"`); nada quando não cruza. Números normalizados (`031` = `31`). Sempre `exit 0`.
- Produces (`lane.sh`): `offset_da_arvore arvore` (ecoa o inteiro), `offset_livre` (ecoa 1..3 ou retorna 1), `descrever_offsets`; `verbo_abrir NN tipo slug [--modelo alias]`, que nesta task termina em `PORTAO OK: <branch> pode abrir em <arvore>, offset +<o>` com `exit 0`.
- Produces (`_lane.sh`): `assert_recusa trecho titulo`.

- [ ] **Step 1: Acrescentar `assert_recusa` ao `_lane.sh`**

Acrescente ao fim de `.claude/tests/_lane.sh`:

```bash
assert_recusa() {
  # $1 = trecho esperado no motivo, $2 = titulo. Le SAIDA_LANE e CODIGO_LANE.
  assert_igual 1 "$CODIGO_LANE" "$2: sai 1"
  assert_contem "$SAIDA_LANE" 'PORTAO RECUSOU' "$2: pelo portao"
  assert_contem "$SAIDA_LANE" "$1" "$2: pelo motivo certo"
}
```

- [ ] **Step 2: Escrever o teste do portão**

Crie `.claude/tests/lane-abrir.tests.sh`:

```bash
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

BACKLOG_PY_TESTE="$DIR_TESTES/../scripts/lib/backlog.py"
_ab33=chore/33-harness-sinal-de-contexto-cheio

nada_criado() {
  # $1 = main tree, $2 = titulo. Nem a branch nem a arvore da 33 existem.
  assert_igual '' "$(git -C "$1" branch --list "$_ab33")" "$2: nenhuma branch criada"
  if [[ -e "$(dirname "$1")/lotus-33-harness-sinal-de-contexto-cheio" ]]; then
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s: a arvore foi criada\n' "$2"
  else
    printf '  ok    %s: nenhuma arvore criada\n' "$2"
  fi
}

# --- backlog.py direto
_abl=$(criar_main_lane); registrar_descarte "$(dirname "$_abl")"
_ablb="$_abl/docs/superpowers/backlog.md"
bl() { python3 "$BACKLOG_PY_TESTE" "$@"; }
assert_igual "harness-estado-por-bloco${US}" "$(bl ficha "$_ablb" 30)" \
  'Depende — : sem dependencia, e o Escopo que cita **Depende:** nao conta'
assert_igual "harness-commands-de-bloco${US}30" "$(bl ficha "$_ablb" 31)" 'Depende 30'
assert_igual "ficha-sem-depende${US}SEM-DEPENDE" "$(bl ficha "$_ablb" 40)" 'ficha sem a declaracao'
assert_igual '' "$(bl ficha "$_ablb" 99)" 'ficha inexistente: nada'
assert_igual "harness-commands-de-bloco${US}30" "$(bl ficha "$_ablb" 031)" 'zero a esquerda acha a ficha'
assert_contem "$(bl conflito "$_ablb" 32 30)" '32 depende de 30' \
  'conflito transitivo, de quem abre para a lane viva'
assert_contem "$(bl conflito "$_ablb" 30 32)" 'a lane viva 32 depende de 30' \
  'conflito transitivo, da lane viva para quem abre'
assert_igual '' "$(bl conflito "$_ablb" 33 30 31)" 'fichas independentes: sem conflito'
assert_igual '' "$(bl conflito "$_ablb" 30 33)" 'citacao no Escopo nao cria dependencia'
assert_contem "$(bl conflito "$_ablb" 33 33)" 'ja tem lane viva' 'a propria ficha viva e conflito'

# --- argumentos
_ab1=$(criar_main_lane); registrar_descarte "$(dirname "$_ab1")"
rodar_lane "$_ab1" abrir 33 chore
assert_recusa 'uso' 'argumentos de menos'
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio --modelo
assert_recusa 'uso' '--modelo sem alias'
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio --outra opus
assert_recusa 'uso' 'flag desconhecida'
rodar_lane "$_ab1" abrir 3x chore harness-sinal-de-contexto-cheio
assert_recusa 'numero' 'NN nao numerico'
rodar_lane "$_ab1" abrir 033 chore harness-sinal-de-contexto-cheio
assert_recusa 'numero' 'NN com zero a esquerda'
rodar_lane "$_ab1" abrir 33 hotfix harness-sinal-de-contexto-cheio
assert_recusa 'tipo' 'tipo fora da D5'
rodar_lane "$_ab1" abrir 33 chore Harness_Sinal
assert_recusa 'slug' 'slug fora do padrao'
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio --modelo OPUS
assert_recusa 'alias' 'alias de modelo fora do padrao'
nada_criado "$_ab1" 'argumentos invalidos'

# --- 1. main tree, na main
_ab1l=$(lane_manual "$_ab1" feat/41-livre-a)
rodar_lane "$_ab1l" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'main tree' 'abrir de dentro de uma lane'
git -C "$_ab1" checkout -q -b outra
rodar_lane "$_ab1" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'na main' 'main tree fora da main'
git -C "$_ab1" checkout -q main
nada_criado "$_ab1" 'recusa 1'

# --- 2. a ficha existe e o slug e o dela
rodar_lane "$_ab1" abrir 99 chore qualquer-coisa
assert_recusa 'nao existe' 'ficha inexistente'
rodar_lane "$_ab1" abrir 33 chore outro-slug
assert_recusa 'nao bate' 'slug diferente do da ficha'
nada_criado "$_ab1" 'recusa 2'

# --- 3. falha fechada sem **Depende:**
rodar_lane "$_ab1" abrir 40 feat ficha-sem-depende
assert_recusa 'Depende' 'ficha sem a linha Depende'
assert_igual '' "$(git -C "$_ab1" branch --list 'feat/40-*')" 'ficha sem Depende: nenhuma branch'

# --- 4. teto de tres lanes
_ab4=$(criar_main_lane); registrar_descarte "$(dirname "$_ab4")"
lane_manual "$_ab4" feat/41-livre-a >/dev/null
lane_manual "$_ab4" fix/42-livre-b >/dev/null
lane_manual "$_ab4" infra/43-livre-c >/dev/null
rodar_lane "$_ab4" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'lanes vivas' 'quarta lane'
nada_criado "$_ab4" 'quarta lane'

# --- 5. dependencia cruzando lane viva, nos dois sentidos
_ab5=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5")"
lane_manual "$_ab5" chore/31-harness-commands-de-bloco >/dev/null
rodar_lane "$_ab5" abrir 32 chore harness-aceitacao-externa
assert_recusa '32 depende de 31' 'abrir o dependente direto de uma lane viva'
rodar_lane "$_ab5" abrir 30 chore harness-estado-por-bloco
assert_recusa 'a lane viva 31 depende de 30' 'abrir a dependencia direta de uma lane viva'

_ab5b=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5b")"
lane_manual "$_ab5b" chore/32-harness-aceitacao-externa >/dev/null
rodar_lane "$_ab5b" abrir 30 chore harness-estado-por-bloco
assert_recusa 'a lane viva 32 depende de 30' 'transitiva, da lane viva para quem abre'

_ab5c=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5c")"
lane_manual "$_ab5c" chore/30-harness-estado-por-bloco >/dev/null
rodar_lane "$_ab5c" abrir 32 chore harness-aceitacao-externa
assert_recusa '32 depende de 30' 'transitiva, de quem abre para a lane viva'

_ab5d=$(criar_main_lane); registrar_descarte "$(dirname "$_ab5d")"
lane_manual "$_ab5d" feat/33-harness-sinal-de-contexto-cheio >/dev/null
rodar_lane "$_ab5d" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja tem lane viva' 'a mesma ficha com outra lane viva'
# O sentido negativo: citar **Depende:** no Escopo nao e declarar.
rodar_lane "$_ab5d" abrir 30 chore harness-estado-por-bloco
assert_igual 0 "$CODIGO_LANE" 'citacao no Escopo nao bloqueia'
assert_contem "$SAIDA_LANE" 'PORTAO OK' 'citacao no Escopo: o portao passa'

# --- 6. branch ou caminho ja existem
_ab6=$(criar_main_lane); registrar_descarte "$(dirname "$_ab6")"
git -C "$_ab6" branch -q "$_ab33"
rodar_lane "$_ab6" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja existe' 'a branch da lane ja existe'
_ab6b=$(criar_main_lane); registrar_descarte "$(dirname "$_ab6b")"
mkdir "$(dirname "$_ab6b")/lotus-33-harness-sinal-de-contexto-cheio"
rodar_lane "$_ab6b" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja existe' 'o caminho da arvore ja existe'
assert_igual '' "$(git -C "$_ab6b" branch --list "$_ab33")" 'caminho ocupado: nenhuma branch criada'

# --- 7. offset livre: o .env de TODA arvore conta, main e orfas incluidos
_ab7=$(criar_main_lane); registrar_descarte "$(dirname "$_ab7")"
printf 'LOTUS_DEV_HTTP_PORT=8081\n' > "$_ab7/.env"
_ab7a=$(lane_manual "$_ab7" preview/a); printf 'LOTUS_DEV_HTTP_PORT=8082\n' > "$_ab7a/.env"
_ab7b=$(lane_manual "$_ab7" preview/b); printf 'LOTUS_DEV_HTTP_PORT="8083"\n' > "$_ab7b/.env"
rodar_lane "$_ab7" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'offset livre' 'offsets 1 a 3 ocupados pelo main e por orfas'
nada_criado "$_ab7" 'sem offset livre'

# --- portao limpo
_abok=$(criar_main_lane); registrar_descarte "$(dirname "$_abok")"
rodar_lane "$_abok" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 0 "$CODIGO_LANE" 'portao limpo sai 0'
assert_contem "$SAIDA_LANE" \
  "PORTAO OK: $_ab33 pode abrir em $(dirname "$_abok")/lotus-33-harness-sinal-de-contexto-cheio, offset +1" \
  'portao limpo: branch, arvore irma e offset +1'
```

- [ ] **Step 3: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em `== lane-abrir.tests.sh` — as asserções de `backlog.py` vêm vazias, e todo `abrir` cai em `verbo 'abrir' desconhecido`, então `assert_recusa` passa só no `PORTAO RECUSOU` e reprova no motivo; o portão limpo reprova.

- [ ] **Step 4: Implementar `backlog.py`**

Crie `.claude/scripts/lib/backlog.py`:

```python
#!/usr/bin/env python3
"""Le fichas do backlog.md para o portao do `lane.sh abrir`.

Uso:
  backlog.py ficha <backlog> <NN>
      stdout  slug<US>deps. deps sao os numeros de **Depende:** separados por
              espaco (vazio quando a ficha declara `—`), ou SEM-DEPENDE
              quando a linha **Prioridade:** da ficha nao tem **Depende:**.
              Ficha inexistente: nada.
  backlog.py conflito <backlog> <NN> [<NN vivo>...]
      stdout  uma linha por lane viva que cruza a dependencia de <NN>, em
              qualquer sentido e transitivamente. Nada quando nao cruza.
  exit 0 sempre. Erro de leitura emite nada, e o lane.sh recusa pela
  ausencia da ficha (falha fechada).

A ficha e `## <NN>. \\`<slug>\\``; termina no proximo `# `, `## ` ou `---`.
**Depende:** e lido so na PRIMEIRA linha **Prioridade:** da ficha: o Escopo
pode citar `**Depende:**` (a ficha 30 cita) e isso nao e declaracao. Ficha
que ja saiu do backlog (fechou) encerra a cadeia: nao ha de onde ler as
dependencias dela.
"""

import re
import sys

SEP = "\x1f"
TITULO = re.compile(r"^## (\d+)\. `([^`]+)`\s*$")
FIM = re.compile(r"^(#{1,2} |---\s*$)")
DEPENDE = re.compile(r"\*\*Depende:\*\*([^·]*)")


def normalizar(n):
    return str(int(n))


def ler_fichas(caminho):
    """{numero: (slug, deps)}; deps e None quando a ficha nao declara."""
    try:
        with open(caminho, encoding="utf-8") as f:
            linhas = f.read().splitlines()
    except OSError:
        return {}
    fichas = {}
    atual = slug = deps = None
    viu_prioridade = False
    for linha in linhas:
        m = TITULO.match(linha)
        if m:
            if atual:
                fichas[atual] = (slug, deps)
            atual, slug, deps = normalizar(m.group(1)), m.group(2), None
            viu_prioridade = False
            continue
        if atual is None:
            continue
        if FIM.match(linha):
            fichas[atual] = (slug, deps)
            atual = None
            continue
        if not viu_prioridade and linha.startswith("**Prioridade:**"):
            viu_prioridade = True
            d = DEPENDE.search(linha)
            if d:
                deps = [normalizar(x) for x in re.findall(r"\d+", d.group(1))]
    if atual:
        fichas[atual] = (slug, deps)
    return fichas


def fecho(fichas, n):
    """Tudo de que n depende, transitivamente."""
    vistos, pilha = set(), [n]
    while pilha:
        f = fichas.get(pilha.pop())
        if not f or not f[1]:
            continue
        for d in f[1]:
            if d not in vistos:
                vistos.add(d)
                pilha.append(d)
    return vistos


def conflitos(fichas, nn, vivas):
    saida = []
    de_nn = fecho(fichas, nn)
    for v in vivas:
        if v == nn:
            saida.append("a ficha %s ja tem lane viva" % nn)
        elif v in de_nn:
            saida.append("%s depende de %s, que tem lane viva" % (nn, v))
        elif nn in fecho(fichas, v):
            saida.append("a lane viva %s depende de %s" % (v, nn))
    return saida


def main(argv):
    if len(argv) < 4:
        return 0
    verbo, caminho = argv[1], argv[2]
    try:
        nn = normalizar(argv[3])
    except ValueError:
        return 0
    fichas = ler_fichas(caminho)
    if verbo == "ficha":
        f = fichas.get(nn)
        if f:
            slug, deps = f
            valor = "SEM-DEPENDE" if deps is None else " ".join(deps)
            sys.stdout.write("%s%s%s\n" % (slug, SEP, valor))
    elif verbo == "conflito":
        vivas = []
        for v in argv[4:]:
            try:
                vivas.append(normalizar(v))
            except ValueError:
                continue
        for linha in conflitos(fichas, nn, vivas):
            sys.stdout.write(linha + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

- [ ] **Step 5: Implementar o portão no `lane.sh`**

Em `.claude/scripts/lane.sh`, acrescente logo antes da linha `verbo=${1:-}`:

```bash
offset_da_arvore() {
  # $1 = arvore. O offset e o que o .env da raiz dela publica, porque e o que
  # o compose le: LOTUS_DEV_HTTP_PORT - 8080. Sem .env ou sem a chave, 0.
  local porta
  porta=$(sed -nE "s/^[[:space:]]*LOTUS_DEV_HTTP_PORT=[\"']?([0-9]+)[\"']?[[:space:]]*\$/\1/p" \
    "$1/.env" 2>/dev/null | tail -n 1)
  [[ -n $porta ]] || { printf '0'; return 0; }
  printf '%s' "$((10#$porta - 8080))"
}

offset_livre() {
  # Ocupado e o que o .env de TODA arvore publica — lane, orfa ou main —,
  # porque arvore fora do padrao de lane tambem sobe stack. Em 2026-09-26
  # ../lotus-infra estava em +1 e ../fix-frontend em +2, as duas orfas: ler
  # so o estado.md das lanes reservaria +1 e colidiria.
  local -a ocupados=()
  local i o
  for i in "${!ARV_CAMINHO[@]}"; do
    ocupados+=("$(offset_da_arvore "${ARV_CAMINHO[$i]}")")
  done
  for o in 1 2 3; do
    [[ " ${ocupados[*]} " == *" $o "* ]] || { printf '%s' "$o"; return 0; }
  done
  return 1
}

descrever_offsets() {
  local i
  for i in "${!ARV_CAMINHO[@]}"; do
    printf '+%s em %s; ' "$(offset_da_arvore "${ARV_CAMINHO[$i]}")" "${ARV_CAMINHO[$i]}"
  done
}

verbo_abrir() {
  local nn=${1:-} tipo=${2:-} slug=${3:-} modelo=terminal
  if (( $# == 5 )) && [[ $4 == --modelo ]]; then
    modelo=$5
  elif (( $# != 3 )); then
    recusar "uso: lane.sh abrir <NN> <tipo> <slug> [--modelo <alias>]"
  fi
  [[ $nn =~ $PADRAO_NN ]] || recusar "NN '$nn' nao e numero de ficha"
  [[ " $TIPOS " == *" $tipo "* ]] || recusar "tipo '$tipo' fora de: $TIPOS"
  [[ $slug =~ $PADRAO_SLUG ]] || recusar "slug '$slug' fora de $PADRAO_SLUG"
  [[ $modelo =~ $PADRAO_ALIAS ]] || recusar "alias de modelo '$modelo' fora de $PADRAO_ALIAS"

  raiz_ou_recusa
  # 1. main tree, na main
  exigir_main_tree abrir
  local backlog="$RAIZ/docs/superpowers/backlog.md"
  [[ -f $backlog ]] || recusar "sem $backlog"
  [[ -f $RAIZ/.env.example ]] || recusar "sem .env.example na raiz, de onde sai o .env da lane"

  # 2. a ficha existe e o slug e o dela
  local ficha slug_ficha deps
  ficha=$(python3 "$BACKLOG_PY" ficha "$backlog" "$nn")
  [[ -n $ficha ]] || recusar "a ficha $nn nao existe no backlog.md"
  IFS=$SEP read -r slug_ficha deps <<<"$ficha"
  [[ $slug_ficha == "$slug" ]] \
    || recusar "o slug '$slug' nao bate com o da ficha $nn ('$slug_ficha')"

  # 3. a ficha declara **Depende:** (falha fechada)
  [[ $deps != SEM-DEPENDE ]] \
    || recusar "a linha **Prioridade:** da ficha $nn nao tem **Depende:**; o Joao declara '—' para nenhuma"

  # 4. teto de lanes
  local -a nums=() branches=()
  local n c b
  while IFS=$SEP read -r n c b; do
    nums+=("$n")
    branches+=("$b")
  done < <(lanes_vivas)
  (( ${#nums[@]} < TETO_LANES )) || recusar "ja ha $TETO_LANES lanes vivas: ${branches[*]}"

  # 5. dependencia cruzando lane viva, nos dois sentidos, transitivamente
  local conflitos
  conflitos=$(python3 "$BACKLOG_PY" conflito "$backlog" "$nn" "${nums[@]}")
  [[ -z $conflitos ]] || recusar "a dependencia cruza lane viva: ${conflitos//$'\n'/; }"

  # 6. branch ou caminho ja existem
  local branch="$tipo/$nn-$slug"
  local arvore
  arvore="$(dirname "$PRINCIPAL")/lotus-$nn-$slug"
  ! git -C "$RAIZ" show-ref --verify --quiet "refs/heads/$branch" \
    || recusar "a branch $branch ja existe"
  [[ ! -e $arvore ]] || recusar "o caminho $arvore ja existe"

  # 7. offset livre de 1 a 3
  local offset
  offset=$(offset_livre) || recusar "nenhum offset livre de 1 a 3: $(descrever_offsets)"

  printf 'PORTAO OK: %s pode abrir em %s, offset +%s\n' "$branch" "$arvore" "$offset"
}
```

E troque o bloco de despacho do fim do arquivo por:

```bash
verbo=${1:-}
(( $# > 0 )) && shift
case $verbo in
  descobrir) verbo_descobrir "$@" ;;
  abrir)     verbo_abrir "$@" ;;
  *) recusar "verbo '$verbo' desconhecido; use descobrir, abrir, conferir ou fechar" ;;
esac
```

- [ ] **Step 6: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== lane-abrir.tests.sh` sem `FALHA`; `OK: 10 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 7: Conferir o `backlog.py` contra o backlog real**

Run: `for n in 31 33 16 12; do python3 .claude/scripts/lib/backlog.py ficha docs/superpowers/backlog.md $n | cat -v; done`
Expected, uma linha cada:
```
harness-commands-de-bloco^_30
harness-sinal-de-contexto-cheio^_
frontend-revisao-ui-por-modulo^_SEM-DEPENDE
cicd-promocao-deploy-e-rollback^_SEM-DEPENDE
```

- [ ] **Step 8: Commit**

```bash
git add .claude/scripts/lib/backlog.py .claude/scripts/lane.sh .claude/tests/_lane.sh .claude/tests/lane-abrir.tests.sh
git commit -m "feat(harness): portao do lane.sh abrir, com Depende transitivo e offset lido do .env"
```

---

### Task 4: `lane.sh abrir` — a criação, e a linha +3 do `.env.example`

**Files:**
- Modify: `.claude/scripts/lane.sh`
- Modify: `.env.example:11-14`
- Modify: `.claude/tests/_lane.sh`
- Test: `.claude/tests/lane-abrir.tests.sh`

**Interfaces:**
- Consumes: `verbo_abrir` e o portão (Task 3); `PRINCIPAL`, `RAIZ`, `PNPM`.
- Produces (`lane.sh`): `portas_do_offset o` (ecoa `http db mailpit minio console vite`), `escrever_env arvore offset`, `copiar_envs arvore`, `semear_estado arvore nn pasta branch offset base modelo`, `falhar_no_meio nn passo`. Depois do portão, `abrir` cria a worktree, o `.env`, copia os `.env` de `backend/` e `frontend/`, roda `$PNPM install --frozen-lockfile` em `frontend/`, semeia e commita `docs/superpowers/blocos/<NN>-<slug>/estado.md` (`chore(<NN>): abre a lane <slug>`) e imprime `LANE ABERTA: <branch> em <arvore>`, a linha de portas e o próximo passo `(cd <arvore> && docker compose up -d)`. Falha no meio: `LANE PELA METADE: …` com o que já existe e `bash .claude/scripts/lane.sh fechar <NN>`, `exit 1`.
- Produces (`_lane.sh`): `criar_falso dir nome [codigo]` (ecoa o caminho; o falso anota `$PWD|$*` em `<caminho>.log`), `portas_do_env arquivo` (ecoa `8081 / 3308 / …`), `linha_da_tabela o` (as seis portas da linha `offset +o` do `.env.example` real).

- [ ] **Step 1: Acrescentar os ajudantes ao `_lane.sh`**

Acrescente ao fim de `.claude/tests/_lane.sh`:

```bash
criar_falso() {
  # $1 = diretorio, $2 = nome, $3 = codigo de saida (default 0). Ecoa o
  # caminho do falso, que anota "$PWD|$*" em <caminho>.log a cada chamada.
  local f="$1/$2"
  cat > "$f" <<FALSO
#!/usr/bin/env bash
printf '%s|%s\n' "\$PWD" "\$*" >> '$f.log'
exit ${3:-0}
FALSO
  chmod +x "$f"
  : > "$f.log"
  printf '%s\n' "$f"
}

portas_do_env() {
  # $1 = .env. As seis portas no formato da tabela do .env.example.
  local k
  local -a v=()
  for k in HTTP DB MAILPIT MINIO MINIO_CONSOLE VITE; do
    v+=("$(sed -nE "s/^LOTUS_DEV_${k}_PORT=([0-9]+)\$/\1/p" "$1")")
  done
  printf '%s / %s / %s / %s / %s / %s' "${v[@]}"
}

linha_da_tabela() {
  # $1 = offset. As seis portas da linha "offset +N" da tabela do
  # .env.example REAL — e o que amarra a formula do lane.sh a documentacao.
  sed -nE "s/^#.*offset \\+$1[[:space:]]+([0-9].*[0-9])[[:space:]]*\$/\\1/p" "$REAL_ENV_EXAMPLE"
}
```

- [ ] **Step 2: Escrever os testes da criação**

Acrescente ao fim de `.claude/tests/lane-abrir.tests.sh`:

```bash
# --- caminho feliz: cria tudo, e so o que deve
_hm=$(criar_main_lane); registrar_descarte "$(dirname "$_hm")"
_hpai=$(dirname "$_hm")
_hbase=$(git -C "$_hm" rev-parse --short main)
_hpnpm=$(criar_falso "$_hpai" pnpm)
_hdocker=$(criar_falso "$_hpai" docker)
_harv="$_hpai/lotus-33-harness-sinal-de-contexto-cheio"
_hest="$_harv/docs/superpowers/blocos/33-harness-sinal-de-contexto-cheio/estado.md"
FAKE_PNPM=$_hpnpm FAKE_DOCKER=$_hdocker \
  rodar_lane "$_hm" abrir 33 chore harness-sinal-de-contexto-cheio --modelo opus
assert_igual 0 "$CODIGO_LANE" 'abrir feliz sai 0'
assert_contem "$SAIDA_LANE" "LANE ABERTA: $_ab33 em $_harv" 'anuncia a lane aberta'
assert_contem "$SAIDA_LANE" 'HTTP 8081' 'anuncia as portas'
assert_contem "$SAIDA_LANE" "(cd $_harv && docker compose up -d)" 'da o proximo passo sem subir o stack'
assert_igual "$_ab33" "$(git -C "$_harv" rev-parse --abbrev-ref HEAD)" 'a arvore esta na branch da lane'
assert_igual '8081 / 3308 / 8026 / 9002 / 9003 / 5174' "$(portas_do_env "$_harv/.env")" \
  '.env da raiz com as seis portas do offset +1'
assert_igual "$(linha_da_tabela 1)" "$(portas_do_env "$_harv/.env")" \
  'as portas batem com a linha +1 da tabela do .env.example'
assert_igual "$(cat "$_hm/backend/.env")" "$(cat "$_harv/backend/.env")" 'backend/.env copiado do main tree'
assert_contem "$(cat "$_harv/frontend/.env")" '# VITE_API_URL=http://localhost:8080' \
  'VITE_API_URL ativa sai comentada'
assert_igual 0 "$(grep -c '^VITE_API_URL=' "$_harv/frontend/.env")" 'nenhuma VITE_API_URL ativa na lane'
assert_contem "$(cat "$_harv/frontend/.env")" 'VITE_ALGO=1' 'o resto do frontend/.env fica'
assert_igual "$_harv/frontend|install --frozen-lockfile" "$(cat "$_hpnpm.log")" \
  'pnpm install --frozen-lockfile em frontend/ da lane'
assert_igual '' "$(cat "$_hdocker.log")" 'abrir nao chama o docker'
assert_igual \
  "3${US}33${US}33-harness-sinal-de-contexto-cheio${US}planning${US}claude${US}continue_active_planning${US}${US}${US}${_ab33}${US}../lotus-33-harness-sinal-de-contexto-cheio${US}1${US}${_hbase}${US}${_hbase}${US}$(id -un)@$(hostname -s) / opus" \
  "$(python3 "$LER_FM_TESTE" "$_hest" schema_version id slug workflow_state next_owner next_action \
      efeito_externo executor branch worktree offset lane_base commit updated_by)" \
  'estado.md semeado com os campos da secao 3.3'
if [[ $(python3 "$LER_FM_TESTE" "$_hest" updated_at) =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+[-+][0-9:]+$ ]]; then
  printf '  ok    updated_at em ISO-8601 com offset\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA updated_at em ISO-8601 com offset\n'
fi
assert_igual 'chore(33): abre a lane harness-sinal-de-contexto-cheio' "$(git -C "$_harv" log -1 --format=%s)" \
  'a semente e commitada na branch da lane'
assert_igual '' "$(git -C "$_harv" status --porcelain)" 'a arvore da lane fica limpa'
assert_igual "$_hbase" "$(git -C "$_hm" rev-parse --short main)" 'a main nao anda'
assert_igual '' "$(git -C "$_hm" status --porcelain)" 'o main tree fica limpo'

# --- +3: orfas em +1 e +2; a linha +3 da tabela e a catraca da formula
_tm=$(criar_main_lane); registrar_descarte "$(dirname "$_tm")"
_t1=$(lane_manual "$_tm" infra/antiga-1); printf 'LOTUS_DEV_HTTP_PORT=8081\n' > "$_t1/.env"
_t2=$(lane_manual "$_tm" refactor/antiga-2); printf 'LOTUS_DEV_HTTP_PORT=8082\n' > "$_t2/.env"
rodar_lane "$_tm" abrir 33 chore harness-sinal-de-contexto-cheio
_t3="$(dirname "$_tm")/lotus-33-harness-sinal-de-contexto-cheio"
assert_contem "$SAIDA_LANE" 'offset +3' 'orfas em +1 e +2: reserva +3'
assert_igual '8083 / 3310 / 8028 / 9006 / 9007 / 5176' "$(portas_do_env "$_t3/.env")" \
  'o +3 e 8083 / 3310 / 8028 / 9006 / 9007 / 5176'
assert_igual "$(linha_da_tabela 3)" "$(portas_do_env "$_t3/.env")" \
  'as portas do +3 batem com a linha +3 da tabela do .env.example'
assert_contem "$(python3 "$LER_FM_TESTE" "$_t3/docs/superpowers/blocos/33-harness-sinal-de-contexto-cheio/estado.md" updated_by)" \
  '/ terminal' 'sem --modelo, updated_by diz terminal'

# --- falha no meio: diz o que ja existe e manda fechar
_fm=$(criar_main_lane); registrar_descarte "$(dirname "$_fm")"
_fpnpm=$(criar_falso "$(dirname "$_fm")" pnpm 1)
FAKE_PNPM=$_fpnpm rodar_lane "$_fm" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 1 "$CODIGO_LANE" 'pnpm falhando: sai 1'
assert_contem "$SAIDA_LANE" 'LANE PELA METADE' 'diz que ficou pela metade'
assert_contem "$SAIDA_LANE" "a branch $_ab33" 'nomeia a branch criada'
assert_contem "$SAIDA_LANE" "a arvore $(dirname "$_fm")/lotus-33-harness-sinal-de-contexto-cheio" 'nomeia a arvore criada'
assert_contem "$SAIDA_LANE" 'lane.sh fechar 33' 'manda fechar'
```

- [ ] **Step 3: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL nas asserções novas de `lane-abrir.tests.sh` — o `abrir` para no `PORTAO OK`, então não há árvore, `.env` nem `estado.md`. Em particular, `as portas do +3 batem com a linha +3` reprova com `esperado: []`: a linha +3 ainda não existe no `.env.example`.

- [ ] **Step 4: Implementar a criação**

Em `.claude/scripts/lane.sh`, acrescente antes de `verbo_abrir()`:

```bash
portas_do_offset() {
  # A formula da tabela do .env.example. O MinIO anda de dois em dois porque
  # publica duas portas (API e console).
  local o=$1
  printf '%s %s %s %s %s %s\n' "$((8080 + o))" "$((3307 + o))" "$((8025 + o))" \
    "$((9000 + 2 * o))" "$((9001 + 2 * o))" "$((5173 + o))"
}

escrever_env() {
  # $1 = arvore, $2 = offset. Parte do .env.example da propria arvore e troca
  # so as seis portas; confere que as seis sairam, para uma chave renomeada no
  # molde nao virar lane na porta do offset zero em silencio.
  local http db mail minio console vite
  read -r http db mail minio console vite <<<"$(portas_do_offset "$2")"
  local esperadas
  esperadas=$(printf '%s\n' \
    "LOTUS_DEV_HTTP_PORT=$http" "LOTUS_DEV_DB_PORT=$db" \
    "LOTUS_DEV_MAILPIT_PORT=$mail" "LOTUS_DEV_MINIO_PORT=$minio" \
    "LOTUS_DEV_MINIO_CONSOLE_PORT=$console" "LOTUS_DEV_VITE_PORT=$vite")
  local -a sed_args=()
  local linha
  while IFS= read -r linha; do
    sed_args+=(-e "s/^[[:space:]]*#?[[:space:]]*${linha%%=*}=.*/$linha/")
  done <<<"$esperadas"
  sed -E "${sed_args[@]}" "$1/.env.example" > "$1/.env" || return 1
  [[ $(grep -cxFf <(printf '%s\n' "$esperadas") "$1/.env") == 6 ]]
}

copiar_envs() {
  # $1 = arvore. backend/.env e frontend/.env nao sao versionados: vem do main
  # tree. VITE_API_URL ativa amarraria o dev server da lane a API do offset
  # zero, entao sai comentada (passo 3 da receita do .env.example).
  local f
  for f in backend/.env frontend/.env; do
    if [[ -f $PRINCIPAL/$f ]]; then
      cp "$PRINCIPAL/$f" "$1/$f" || return 1
    else
      printf 'aviso: o main tree nao tem %s; a lane fica sem ele\n' "$f"
    fi
  done
  if [[ -f $1/frontend/.env ]]; then
    sed -i -E 's/^([[:space:]]*VITE_API_URL=)/# \1/' "$1/frontend/.env" || return 1
  fi
  return 0
}

semear_estado() {
  # $1 arvore, $2 NN, $3 pasta (NN-slug), $4 branch, $5 offset, $6 SHA da
  # main, $7 alias do modelo. Campos da secao 3.3 da spec; o contrato de
  # cada um esta em docs/superpowers/state.md.
  local pasta="$1/docs/superpowers/blocos/$3"
  mkdir -p "$pasta" || return 1
  cat > "$pasta/estado.md" <<ESTADO
---
schema_version: 3
id: $2
slug: $3
workflow_state: planning
next_owner: claude
next_action: continue_active_planning
resume_state: null
active_spec: null
active_plan: null
active_review: null
active_acceptance: null
context_packet: null
efeito_externo: null
executor: null
branch: $4
worktree: ../lotus-$3
offset: $5
lane_base: $6
commit: $6
blocker: null
updated_at: $(date -Iseconds)
updated_by: $(id -un)@$(hostname -s) / $7
---

# Bloco $2 — estado

Aberto por lane.sh abrir. O contrato dos campos esta em docs/superpowers/state.md.
ESTADO
}

falhar_no_meio() {
  # $1 = NN, $2 = o passo que falhou. CRIADO lista o que ja existe no disco.
  local ja='nada'
  (( ${#CRIADO[@]} > 0 )) && ja=$(printf '%s; ' "${CRIADO[@]}")
  printf 'LANE PELA METADE: %s falhou. Ja existe: %s Desfaca com: bash .claude/scripts/lane.sh fechar %s\n' \
    "$2" "$ja" "$1" >&2
  exit 1
}
```

E, dentro de `verbo_abrir`, troque a última linha

```bash
  printf 'PORTAO OK: %s pode abrir em %s, offset +%s\n' "$branch" "$arvore" "$offset"
}
```

por

```bash
  printf 'PORTAO OK: %s pode abrir em %s, offset +%s\n' "$branch" "$arvore" "$offset"

  local base pasta="$nn-$slug"
  base=$(git -C "$RAIZ" rev-parse --short main)
  CRIADO=()
  git -C "$RAIZ" worktree add -q -b "$branch" "$arvore" main \
    || falhar_no_meio "$nn" 'git worktree add'
  CRIADO+=("a branch $branch" "a arvore $arvore")
  escrever_env "$arvore" "$offset" || falhar_no_meio "$nn" 'o .env da raiz'
  copiar_envs "$arvore" || falhar_no_meio "$nn" 'a copia de backend/.env e frontend/.env'
  (cd "$arvore/frontend" && "$PNPM" install --frozen-lockfile) \
    || falhar_no_meio "$nn" "$PNPM install --frozen-lockfile"
  semear_estado "$arvore" "$nn" "$pasta" "$branch" "$offset" "$base" "$modelo" \
    || falhar_no_meio "$nn" 'a semente do estado.md'
  # Sem este commit o fechar recusaria a arvore suja pelo proprio estado.md.
  { git -C "$arvore" add "docs/superpowers/blocos/$pasta/estado.md" \
      && git -C "$arvore" commit -q -m "chore($nn): abre a lane $slug"; } \
    || falhar_no_meio "$nn" 'o commit da semente'

  local http db mail minio console vite
  read -r http db mail minio console vite <<<"$(portas_do_offset "$offset")"
  printf 'LANE ABERTA: %s em %s\n' "$branch" "$arvore"
  printf '  portas: HTTP %s, DB %s, Mailpit %s, MinIO %s/%s, Vite %s\n' \
    "$http" "$db" "$mail" "$minio" "$console" "$vite"
  printf '  proximo passo, quando o bloco precisar do stack: (cd %s && docker compose up -d)\n' "$arvore"
}
```

- [ ] **Step 5: Rodar e ver só a catraca do +3 reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: exatamente uma `FALHA` — `as portas do +3 batem com a linha +3 da tabela do .env.example`, com `esperado: []`. Todo o resto de `lane-abrir.tests.sh` em `ok`. É a catraca vista reprovar antes da linha existir.

- [ ] **Step 6: Acrescentar a linha +3 ao `.env.example`**

Em `.env.example`, logo depois da linha `#   terceira árvore     offset +2   8082 / 3309 / 8027 / 9004 / 9005 / 5175`, acrescente:

```
#   quarta árvore       offset +3   8083 / 3310 / 8028 / 9006 / 9007 / 5176
```

(A coluna `offset` fica alinhada na coluna 25, como as de cima.)

- [ ] **Step 7: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: nenhuma `FALHA`; `OK: 10 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 8: Commit**

```bash
git add .claude/scripts/lane.sh .claude/tests/_lane.sh .claude/tests/lane-abrir.tests.sh .env.example
git commit -m "feat(harness): lane.sh abrir cria a lane no offset livre e semeia o estado.md"
```

---

### Task 5: `lane.sh conferir`

**Files:**
- Modify: `.claude/scripts/lane.sh`
- Test: `.claude/tests/lane-conferir.tests.sh`

**Interfaces:**
- Consumes: `recusar`, `raiz_ou_recusa`, `lanes_vivas`, `SEP`, `PADRAO_NN` (Task 2); `criar_main_lane`, `lane_manual`, `rodar_lane`, `assert_recusa` (`_lane.sh`).
- Produces (`lane.sh`): `arquivos_do_plano plano.md` (caminhos entre crases das linhas `- Create|Modify|Test|Delete:`, sem sufixo `:N` ou `:N-M`, ordenados, únicos); `bash lane.sh conferir <NN>` → `SEM CONFLITO: lane <NN> contra <k> plano(s)` com `exit 0`, ou uma seção `CONFLITO: <meu plano> e <outro plano> tocam os mesmos arquivos:` por par, com os arquivos indentados, e `exit 1`. Lane viva sem plano é pulada; a própria lane sem plano recusa.

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/lane-conferir.tests.sh`:

```bash
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
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em `== lane-conferir.tests.sh` — todo `conferir` cai em `verbo 'conferir' desconhecido`.

- [ ] **Step 3: Implementar**

Em `.claude/scripts/lane.sh`, acrescente antes da linha `verbo=${1:-}`:

```bash
arquivos_do_plano() {
  # $1 = plano.md. Os caminhos entre crases das linhas
  # `- Create|Modify|Test|Delete:` dos blocos **Files:**, sem o sufixo :linha,
  # um por linha, ordenados e unicos. Crase fora dessas linhas nao conta.
  grep -E '^[[:space:]]*- (Create|Modify|Test|Delete):' "$1" \
    | grep -oE '`[^`]+`' | tr -d '`' | sed -E 's/:[0-9]+(-[0-9]+)?$//' | LC_ALL=C sort -u
}

verbo_conferir() {
  (( $# == 1 )) || recusar "uso: lane.sh conferir <NN>"
  local nn=$1
  [[ $nn =~ $PADRAO_NN ]] || recusar "NN '$nn' nao e numero de ficha"
  raiz_ou_recusa
  local n c b meu=''
  local -a outros=()
  while IFS=$SEP read -r n c b; do
    if [[ $n == "$nn" ]]; then
      meu="$c/docs/superpowers/blocos/${b#*/}/plano.md"
    else
      outros+=("$c/docs/superpowers/blocos/${b#*/}/plano.md")
    fi
  done < <(lanes_vivas)
  [[ -n $meu ]] || recusar "nenhuma lane viva com o numero $nn"
  [[ -f $meu ]] || recusar "a lane $nn nao tem plano em $meu"
  local meus p comuns lidos=0 achou=0
  meus=$(arquivos_do_plano "$meu")
  for p in "${outros[@]}"; do
    [[ -f $p ]] || continue
    lidos=$((lidos + 1))
    comuns=$(LC_ALL=C comm -12 <(printf '%s\n' "$meus") <(arquivos_do_plano "$p"))
    [[ -z $comuns ]] && continue
    achou=1
    printf 'CONFLITO: %s e %s tocam os mesmos arquivos:\n' "$meu" "$p"
    printf '%s\n' "$comuns" | sed 's/^/  /'
  done
  (( achou == 0 )) || exit 1
  printf 'SEM CONFLITO: lane %s contra %s plano(s)\n' "$nn" "$lidos"
}
```

E acrescente ao `case` do fim, depois de `abrir)`:

```bash
  conferir)  verbo_conferir "$@" ;;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== lane-conferir.tests.sh` sem `FALHA`; `OK: 11 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/lane.sh .claude/tests/lane-conferir.tests.sh
git commit -m "feat(harness): lane.sh conferir cruza os Files dos planos das lanes vivas"
```

---

### Task 6: `lane.sh fechar`

**Files:**
- Modify: `.claude/scripts/lane.sh`
- Test: `.claude/tests/lane-fechar.tests.sh`

**Interfaces:**
- Consumes: `recusar`, `raiz_ou_recusa`, `exigir_main_tree`, `lanes_vivas`, `DOCKER` (Task 2); o `abrir` inteiro (Task 4); `criar_main_lane`, `rodar_lane`, `criar_falso`, `assert_recusa` (`_lane.sh`).
- Produces (`lane.sh`): `bash lane.sh fechar <NN> [--force]` — main tree na `main`; recusa árvore suja (com ou sem `--force`) e, sem `--force`, branch não mesclada na `main`, **antes** de chamar o docker; depois `(cd <arvore> && $DOCKER compose down -v --rmi local)` quando `$DOCKER` existe (senão avisa `ausente`), `git worktree remove`, `git branch -d` (`-D` com `--force`) e `LANE FECHADA: <branch>, arvore <arvore> removida`. Falha depois de começar a destruir: `FECHAMENTO PELA METADE: …`, `exit 1`.

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/lane-fechar.tests.sh`:

```bash
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

_xbr=chore/33-harness-sinal-de-contexto-cheio

lane_de_pe() {
  # $1 = arvore, $2 = main tree, $3 = titulo.
  if [[ -d $1 && -n $(git -C "$2" branch --list "$_xbr") ]]; then
    printf '  ok    %s: arvore e branch continuam de pe\n' "$3"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA %s: a lane sumiu\n' "$3"
  fi
}

lane_sumiu() {
  # $1 = arvore, $2 = main tree, $3 = titulo.
  if [[ ! -e $1 && -z $(git -C "$2" branch --list "$_xbr") \
        && -z $(git -C "$2" worktree list --porcelain | grep -F "$1") ]]; then
    printf '  ok    %s: arvore, registro e branch sumiram\n' "$3"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA %s: sobrou arvore, registro ou branch\n' "$3"
  fi
}

# --- cenario: a lane 33 aberta pelo proprio abrir
_xm=$(criar_main_lane); registrar_descarte "$(dirname "$_xm")"
_xarv="$(dirname "$_xm")/lotus-33-harness-sinal-de-contexto-cheio"
_xdocker=$(criar_falso "$(dirname "$_xm")" docker)
rodar_lane "$_xm" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 0 "$CODIGO_LANE" 'cenario: a lane 33 abre'

# --- arvore suja: recusa, e nem --force passa
: > "$_xarv/sujo.txt"
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33
assert_recusa 'nao commitada' 'arvore suja'
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33 --force
assert_recusa 'nao commitada' '--force com arvore suja'
lane_de_pe "$_xarv" "$_xm" 'arvore suja'
rm -f "$_xarv/sujo.txt"

# --- branch nao mesclada: a semente do abrir e um commit so dela
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33
assert_recusa 'nao esta mesclada' 'branch nao mesclada'
lane_de_pe "$_xarv" "$_xm" 'branch nao mesclada'
assert_igual '' "$(cat "$_xdocker.log")" 'recusa antes de chamar o docker'

# --- outras recusas
FAKE_DOCKER=$_xdocker rodar_lane "$_xarv" fechar 33
assert_recusa 'main tree' 'fechar de dentro da lane'
rodar_lane "$_xm" fechar 99
assert_recusa 'nenhuma lane viva' 'lane inexistente'
rodar_lane "$_xm" fechar 33 --forca
assert_recusa 'uso' 'flag desconhecida'
lane_de_pe "$_xarv" "$_xm" 'recusas de argumento'

# --- caminho feliz: a PR mesclou
git -C "$_xm" merge -q --no-ff "$_xbr" -m 'merge da lane 33' >/dev/null 2>&1
FAKE_DOCKER=$_xdocker rodar_lane "$_xm" fechar 33
assert_igual 0 "$CODIGO_LANE" 'mesclada e limpa: fecha'
assert_contem "$SAIDA_LANE" "LANE FECHADA: $_xbr" 'anuncia o fechamento'
assert_igual "$_xarv|compose down -v --rmi local" "$(cat "$_xdocker.log")" \
  'derruba o stack da lane, com volume e imagem local, na arvore dela'
lane_sumiu "$_xarv" "$_xm" 'fechar feliz'

# --- --force: branch nao mesclada sai com -D
_ym=$(criar_main_lane); registrar_descarte "$(dirname "$_ym")"
rodar_lane "$_ym" abrir 33 chore harness-sinal-de-contexto-cheio
rodar_lane "$_ym" fechar 33 --force
assert_igual 0 "$CODIGO_LANE" '--force fecha branch nao mesclada'
lane_sumiu "$(dirname "$_ym")/lotus-33-harness-sinal-de-contexto-cheio" "$_ym" '--force'

# --- docker ausente: fecha mesmo assim, e diz
_zm=$(criar_main_lane); registrar_descarte "$(dirname "$_zm")"
rodar_lane "$_zm" abrir 33 chore harness-sinal-de-contexto-cheio
git -C "$_zm" merge -q --no-ff "$_xbr" -m 'merge da lane 33' >/dev/null 2>&1
FAKE_DOCKER=/caminho/que/nao/existe/docker rodar_lane "$_zm" fechar 33
assert_igual 0 "$CODIGO_LANE" 'docker ausente: fecha'
assert_contem "$SAIDA_LANE" 'ausente' 'docker ausente: avisa'
lane_sumiu "$(dirname "$_zm")/lotus-33-harness-sinal-de-contexto-cheio" "$_zm" 'docker ausente'

# --- abrir pela metade: o fechar sem --force desfaz
_wm=$(criar_main_lane); registrar_descarte "$(dirname "$_wm")"
FAKE_PNPM=$(criar_falso "$(dirname "$_wm")" pnpm 1) rodar_lane "$_wm" abrir 33 chore harness-sinal-de-contexto-cheio
assert_igual 1 "$CODIGO_LANE" 'cenario: o abrir fica pela metade'
rodar_lane "$_wm" fechar 33
assert_igual 0 "$CODIGO_LANE" 'o fechar desfaz a lane pela metade, sem --force'
lane_sumiu "$(dirname "$_wm")/lotus-33-harness-sinal-de-contexto-cheio" "$_wm" 'pela metade'
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em `== lane-fechar.tests.sh` — todo `fechar` cai em `verbo 'fechar' desconhecido`; `lane_sumiu` reprova nos quatro casos.

- [ ] **Step 3: Implementar**

Em `.claude/scripts/lane.sh`, acrescente antes da linha `verbo=${1:-}`:

```bash
verbo_fechar() {
  local forca=0
  if (( $# == 2 )) && [[ $2 == --force ]]; then
    forca=1
  elif (( $# != 1 )); then
    recusar "uso: lane.sh fechar <NN> [--force]"
  fi
  local nn=$1
  [[ $nn =~ $PADRAO_NN ]] || recusar "NN '$nn' nao e numero de ficha"
  raiz_ou_recusa
  exigir_main_tree fechar
  local n c b cam='' br=''
  while IFS=$SEP read -r n c b; do
    [[ $n == "$nn" ]] && { cam=$c; br=$b; }
  done < <(lanes_vivas)
  [[ -n $cam ]] || recusar "nenhuma lane viva com o numero $nn"
  # Arquivo ignorado nao conta: os .env e o node_modules saem junto com a
  # arvore. O resto e trabalho que o fechar apagaria.
  [[ -z $(git -C "$cam" status --porcelain 2>/dev/null) ]] \
    || recusar "a arvore $cam tem mudanca nao commitada; nem --force passa por cima disso"
  if (( forca == 0 )); then
    git -C "$RAIZ" merge-base --is-ancestor "$br" main \
      || recusar "a branch $br nao esta mesclada na main; fechar agora apagaria commits"
  fi

  # Daqui para baixo destroi. O banco de dev da lane morre com ela, de
  # proposito: volume (-v) e a imagem do app construida para esta arvore
  # (--rmi local). Sem teste de "o projeto tem conteiner?" antes: down num
  # projeto vazio e no-op, e o teste seria so mais um jeito de errar.
  if command -v "$DOCKER" >/dev/null 2>&1; then
    (cd "$cam" && "$DOCKER" compose down -v --rmi local) || {
      printf 'FECHAMENTO PELA METADE: docker compose down falhou em %s; a arvore e a branch ficaram\n' "$cam" >&2
      exit 1
    }
  else
    printf 'aviso: %s ausente, nenhum stack para derrubar\n' "$DOCKER"
  fi
  git -C "$RAIZ" worktree remove "$cam" || {
    printf 'FECHAMENTO PELA METADE: git worktree remove falhou em %s; o stack ja caiu\n' "$cam" >&2
    exit 1
  }
  local flag=-d
  (( forca == 1 )) && flag=-D
  git -C "$RAIZ" branch -q "$flag" "$br" || {
    printf 'FECHAMENTO PELA METADE: git branch %s %s falhou; a arvore ja foi removida\n' "$flag" "$br" >&2
    exit 1
  }
  printf 'LANE FECHADA: %s, arvore %s removida\n' "$br" "$cam"
}
```

E acrescente ao `case` do fim, depois de `conferir)`:

```bash
  fechar)    verbo_fechar "$@" ;;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== lane-fechar.tests.sh` sem `FALHA`; `OK: 12 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/lane.sh .claude/tests/lane-fechar.tests.sh
git commit -m "feat(harness): lane.sh fechar recusa antes de destruir e derruba o stack da lane"
```

---

### Task 7: `familia_lane` no classificador

**Files:**
- Modify: `.claude/hooks/lib/classificar-comando.py` (constantes novas depois de `GH_API_ESCRITA`; `familia_lane` antes de `classificar_simples`; despacho dentro de `classificar_simples`)
- Test: `.claude/tests/classificar-comando.tests.sh`
- Test: `.claude/tests/guard-main-shell.tests.sh`

**Interfaces:**
- Consumes: `negar`, `classificar_simples` (tokens já desaspados, `nome`, `args`).
- Produces: `familia_lane(args)`, chamada quando `nome == "bash" and args and args[0] == LANE_SCRIPT`, **antes** do teste de `NEGADOS_SEMPRE`. Libera só `descobrir`; `conferir <NN>`; `fechar <NN>`; `abrir <NN> <tipo> <slug>` e `abrir <NN> <tipo> <slug> --modelo <alias>`. Todo o resto nega, com motivo que cita `terminal do Joao`.

- [ ] **Step 1: Escrever os testes**

Acrescente ao fim de `.claude/tests/classificar-comando.tests.sh`:

```bash
# --- item 30: lane.sh e a unica porta de `bash` na main (spec 2026-09-26, 4.4)
assert_libera 'bash .claude/scripts/lane.sh descobrir'
assert_libera 'bash .claude/scripts/lane.sh descobrir | grep lane'
assert_libera 'bash .claude/scripts/lane.sh abrir 33 chore harness-sinal-de-contexto-cheio'
assert_libera 'bash .claude/scripts/lane.sh abrir 33 chore harness-sinal-de-contexto-cheio --modelo opus'
assert_libera 'bash .claude/scripts/lane.sh abrir 31 feat x1 --modelo sonnet-5.1'
assert_libera 'bash .claude/scripts/lane.sh conferir 31'
assert_libera 'bash .claude/scripts/lane.sh fechar 31'
assert_nega   'bash .claude/scripts/lane.sh fechar 31 --force'
assert_nega   'bash .claude/scripts/lane.sh fechar --force 31'
assert_nega   'bash .claude/scripts/lane.sh fechar 31 "--force"'
assert_nega   'bash .claude/scripts/lane.sh descobrir extra'
assert_nega   'bash .claude/scripts/lane.sh conferir'
assert_nega   'bash .claude/scripts/lane.sh conferir 31 32'
assert_nega   'bash .claude/scripts/lane.sh abrir 33 chore Slug_Ruim'
assert_nega   'bash .claude/scripts/lane.sh abrir 33 hotfix harness-x'
assert_nega   'bash .claude/scripts/lane.sh abrir 3x chore harness-x'
assert_nega   'bash .claude/scripts/lane.sh abrir 033 chore harness-x'
assert_nega   'bash .claude/scripts/lane.sh abrir 33 chore harness-x --modelo OPUS'
assert_nega   'bash .claude/scripts/lane.sh abrir 33 chore harness-x --model opus'
assert_nega   'bash .claude/scripts/lane.sh abrir 33 chore harness-x --modelo'
assert_nega   'bash .claude/scripts/lane.sh abrir 33 chore harness-x --modelo opus extra'
assert_nega   'bash .claude/scripts/lane.sh abrir $(echo 33) chore harness-x'
assert_nega   'bash .claude/scripts/lane.sh'
assert_nega   'bash .claude/scripts/lane.sh apagar 31'
assert_nega   'bash -x .claude/scripts/lane.sh descobrir'
assert_nega   'bash ./.claude/scripts/lane.sh descobrir'
assert_nega   '/bin/bash .claude/scripts/lane.sh descobrir'
assert_nega   'bash .claude/scripts/outro.sh descobrir'
assert_nega   'bash .claude/scripts/lane.sh descobrir; rm -rf backend'
assert_nega   'bash .claude/scripts/lane.sh descobrir > saida.txt'
assert_nega   'sh .claude/scripts/lane.sh descobrir'
assert_nega   'bash -c "bash .claude/scripts/lane.sh descobrir"'
assert_nega   'bash'
assert_contem "$(classificar 'bash .claude/scripts/lane.sh fechar 31 --force')" \
              'terminal do Joao' 'fechar --force nega pelo motivo certo'
```

Acrescente ao fim de `.claude/tests/guard-main-shell.tests.sh`:

```bash
# --- item 30: lane.sh fim a fim, pela casca, na main
acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'bash .claude/scripts/lane.sh descobrir')"
assert_igual '' "$SAIDA_HOOK" 'libera lane.sh descobrir na main'
acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'bash .claude/scripts/lane.sh abrir 33 chore harness-sinal-de-contexto-cheio --modelo opus')"
assert_igual '' "$SAIDA_HOOK" 'libera lane.sh abrir na main'
acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'bash .claude/scripts/lane.sh fechar 33 --force')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'nega fechar --force na main'
acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'bash .claude/scripts/outro.sh')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'bash com outro script segue negado na main'
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL nos sete `assert_libera` novos (`bash executa codigo arbitrario ou escreve arquivo`), no `assert_contem` do motivo e nas duas liberações do `guard-main-shell`. Os `assert_nega` passam já agora — é por isso que eles sozinhos não provam nada.

- [ ] **Step 3: Implementar**

Em `.claude/hooks/lib/classificar-comando.py`, acrescente logo depois do bloco `GH_API_ESCRITA = {…}`:

```python
# `lane.sh` e a unica porta de `bash` na main (spec 2026-09-26, 4.4). O
# script cria e remove worktree e branch, entao a liberacao e por FORMA
# EXATA: verbo literal e cada argumento validado. `fechar --force` troca o
# `git branch -d` por `-D` e fica no terminal do Joao.
LANE_SCRIPT = ".claude/scripts/lane.sh"
LANE_TIPOS = {"feat", "fix", "chore", "refactor", "infra", "cicd", "docs"}
LANE_NN = re.compile(r"[1-9][0-9]*")
LANE_SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
LANE_ALIAS = re.compile(r"[a-z0-9.-]+")
```

Acrescente logo antes de `def classificar_simples(tokens):`:

```python
def familia_lane(args):
    """args[0] ja e LANE_SCRIPT. Libera so as quatro formas da spec."""
    resto = args[1:]
    if not resto:
        negar("`lane.sh` sem verbo.")
    verbo, params = resto[0], resto[1:]
    if verbo == "descobrir" and not params:
        return
    if verbo in ("conferir", "fechar") and len(params) == 1 \
            and LANE_NN.fullmatch(params[0]):
        return
    if verbo == "abrir" and len(params) in (3, 5):
        nn, tipo, slug = params[:3]
        if LANE_NN.fullmatch(nn) and tipo in LANE_TIPOS \
                and LANE_SLUG.fullmatch(slug):
            if len(params) == 3:
                return
            if params[3] == "--modelo" and LANE_ALIAS.fullmatch(params[4]):
                return
    negar("`lane.sh %s` fora das formas liberadas na main: `descobrir`, "
          "`conferir <NN>`, `fechar <NN>` e `abrir <NN> <tipo> <slug> "
          "[--modelo <alias>]`. `fechar --force` e do terminal do Joao."
          % " ".join(resto))
```

E, em `classificar_simples`, logo antes de `if base in NEGADOS_SEMPRE:`:

```python
    if nome == "bash" and args and args[0] == LANE_SCRIPT:
        return familia_lane(args)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: nenhuma `FALHA`; `OK: 12 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/classificar-comando.py .claude/tests/classificar-comando.tests.sh .claude/tests/guard-main-shell.tests.sh
git commit -m "feat(harness): libera na main so as quatro formas exatas do lane.sh"
```

---

### Task 8: `estados.sh` — mapa de tokens e coerência

**Files:**
- Create: `.claude/hooks/lib/estados.sh`
- Test: `.claude/tests/estados.tests.sh`

**Interfaces:**
- Consumes: `ler-frontmatter.py` (Task 1); `escrever_estado_lane` (`_lane.sh`, Task 2).
- Produces: `TOKEN_DO_ESTADO` (array associativo global, 12 entradas, a tabela da §3.4); `ORDEM_DE_FASE` (11 estados, sem `blocked`); `posicao_de_fase estado` (ecoa o índice ou `-1`); `coerencia_da_lane estado.md branch_do_git raiz` — um problema por linha no stdout, nada quando coerente. Acusa: `sem estado.md`; `branch` diferente do git; `workflow_state` desconhecido; primeira palavra do `next_action` diferente do token; `blocked` sem `resume_state`; a partir de `ready_for_execution` (em `blocked`, pela régua do `resume_state`) `active_plan` vazio ou inexistente e `efeito_externo` fora de `sim|nao`; a partir de `ready_for_closure` `active_review` vazio ou inexistente. Os ponteiros `active_*` são relativos a `raiz`.

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/estados.tests.sh`:

```bash
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
co_estado blocked resolve_blocker 'efeito_externo: nao'
assert_contem "$(co)" 'resume_state' 'blocked sem resume_state'
co_estado blocked resolve_blocker 'resume_state: executing' 'efeito_externo: nao'
assert_contem "$(co)" 'active_plan' 'blocked vindo de executing: a regua e o resume_state'
rm -f "$_coe"
assert_contem "$(co)" 'sem estado.md' 'estado.md ausente'
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em `== estados.tests.sh` — `estados.sh` não existe (`No such file or directory` no `source`), `TOKEN_DO_ESTADO` tem 0 entradas e `coerencia_da_lane: command not found`.

- [ ] **Step 3: Implementar**

Crie `.claude/hooks/lib/estados.sh`:

```bash
# Mapa estado -> token do next_action e coerencia de um estado.md
# (spec 2026-09-26-harness-paridade-eladecora-design.md, 3.4 e 4.3).
# O mapa vive UMA vez aqui. A tabela "Estados validos" do state.md o espelha,
# e o estados.tests.sh reprova a divergencia nos dois sentidos (licao 19).

declare -gA TOKEN_DO_ESTADO=(
  [idle]=select_backlog_item
  [context_required]=generate_context_packet
  [ready_for_planning]=plan_active_work_item
  [planning]=continue_active_planning
  [ready_for_execution]=execute_active_plan
  [executing]=continue_active_plan
  [ready_for_review]=request_code_review
  [reviewing]=approve_review_findings
  [ready_for_closure]=close_active_work_item
  [closing]=answer_integration_menu
  [blocked]=resolve_blocker
  [closed]=none
)

# Ordem de fase para as regras "a partir de". `blocked` fica fora: nele a
# regua e o resume_state.
ORDEM_DE_FASE=(idle context_required ready_for_planning planning
               ready_for_execution executing ready_for_review reviewing
               ready_for_closure closing closed)

_ESTADOS_LER_FM="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/ler-frontmatter.py"

posicao_de_fase() {
  local i
  for i in "${!ORDEM_DE_FASE[@]}"; do
    [[ ${ORDEM_DE_FASE[$i]} == "$1" ]] && { printf '%s' "$i"; return 0; }
  done
  printf '%s' -1
}

coerencia_da_lane() {
  # $1 = estado.md, $2 = branch que o git da para a arvore, $3 = raiz da
  # arvore (os ponteiros active_* sao relativos a ela). Um problema por linha
  # no stdout; nada quando coerente.
  local estado=$1 branch_git=$2 raiz=$3
  if [[ ! -f $estado ]]; then
    printf 'sem estado.md em %s\n' "$estado"
    return 0
  fi
  local ws='' na='' br='' resume='' plano='' review='' efeito=''
  IFS=$'\x1f' read -r ws na br resume plano review efeito < <(python3 "$_ESTADOS_LER_FM" \
    "$estado" workflow_state next_action branch resume_state active_plan active_review efeito_externo)
  [[ $br == "$branch_git" ]] \
    || printf 'branch: o estado.md diz %s, o git diz %s\n' "${br:-vazio}" "$branch_git"
  local token=${TOKEN_DO_ESTADO[$ws]:-}
  if [[ -z $ws || -z $token ]]; then
    printf 'workflow_state desconhecido: %s\n' "${ws:-vazio}"
    return 0
  fi
  [[ ${na%% *} == "$token" ]] \
    || printf 'next_action: %s pede o token %s, e o estado.md diz %s\n' "$ws" "$token" "${na:-vazio}"
  local regua=$ws
  if [[ $ws == blocked ]]; then
    if [[ -z $resume ]]; then
      printf 'blocked sem resume_state\n'
      return 0
    fi
    regua=$resume
  fi
  local pos
  pos=$(posicao_de_fase "$regua")
  if (( pos < 0 )); then
    printf 'resume_state desconhecido: %s\n' "$regua"
    return 0
  fi
  if (( pos >= $(posicao_de_fase ready_for_execution) )); then
    if [[ -z $plano ]]; then
      printf 'active_plan vazio a partir de ready_for_execution\n'
    elif [[ ! -f $raiz/$plano ]]; then
      printf 'active_plan aponta para %s, que nao existe\n' "$plano"
    fi
    [[ $efeito == sim || $efeito == nao ]] \
      || printf 'efeito_externo %s a partir de ready_for_execution; vale sim ou nao, e null nunca vale nao\n' "${efeito:-null}"
  fi
  if (( pos >= $(posicao_de_fase ready_for_closure) )); then
    if [[ -z $review ]]; then
      printf 'active_review vazio a partir de ready_for_closure\n'
    elif [[ ! -f $raiz/$review ]]; then
      printf 'active_review aponta para %s, que nao existe\n' "$review"
    fi
  fi
  return 0
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== estados.tests.sh` sem `FALHA`; `OK: 13 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/estados.sh .claude/tests/estados.tests.sh
git commit -m "feat(harness): mapa estado-token e regra de coerencia do estado.md"
```

---

### Task 9: Prova do DoD num clone descartável

`abrir` e `fechar` vistos rodar de verdade, com stack real, sem tocar o repositório real (spec §4.6, decisão do João). Toda linha abaixo roda da sessão em `../lotus-harness`; o clone e as árvores dele ficam no `TMPDIR`.

**Files:**
- Create: `docs/superpowers/audits/2026-09-26-item30-prova-lane.md`

**Interfaces:**
- Consumes: o `lane.sh` inteiro (Tasks 2–6), a linha +3 do `.env.example` (Task 4), a ficha 33 com `**Depende:** —` no `backlog.md` desta branch.
- Produces: o arquivo de evidência, com a saída literal de cada passo.

- [ ] **Step 1: Montar o clone com a ponta do 30 mesclada na `main` dele**

```bash
PROVA=$(mktemp -d "${TMPDIR:-/tmp}/lotus-prova-30.XXXXXX"); echo "$PROVA"
git clone -q --branch main /home/jvbat/projetos/lotus "$PROVA/lotus"
git -C "$PROVA/lotus" merge -q --no-ff origin/chore/30-harness-estado-por-bloco -m 'merge: ponta do item 30 (prova)'
cp /home/jvbat/projetos/lotus/backend/.env "$PROVA/lotus/backend/.env"
cp /home/jvbat/projetos/lotus/frontend/.env "$PROVA/lotus/frontend/.env"
git -C "$PROVA/lotus" worktree add -q -b infra/antiga-1 "$PROVA/lotus-antiga-1" main
git -C "$PROVA/lotus" worktree add -q -b refactor/antiga-2 "$PROVA/lotus-antiga-2" main
printf 'LOTUS_DEV_HTTP_PORT=8081\n' > "$PROVA/lotus-antiga-1/.env"
printf 'LOTUS_DEV_HTTP_PORT=8082\n' > "$PROVA/lotus-antiga-2/.env"
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh descobrir | cat -v)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8083/up
```

Expected: duas linhas `orfa^_…` (`infra/antiga-1` e `refactor/antiga-2`), nenhuma `lane`; o `curl` imprime `000` (a 8083 está livre). Se a 8083 responder, PARE: há stack de outra árvore em +3 e a prova colidiria.

- [ ] **Step 2: Abrir a lane 33**

```bash
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh abrir 33 chore harness-sinal-de-contexto-cheio --modelo opus); echo "exit=$?"
L="$PROVA/lotus-33-harness-sinal-de-contexto-cheio"
grep '^LOTUS_DEV_' "$L/.env"
cat "$L/docs/superpowers/blocos/33-harness-sinal-de-contexto-cheio/estado.md"
```

Expected: `PORTAO OK: chore/33-harness-sinal-de-contexto-cheio pode abrir em …, offset +3`, a saída real do `pnpm install --frozen-lockfile`, `LANE ABERTA: …`, `portas: HTTP 8083, DB 3310, Mailpit 8028, MinIO 9006/9007, Vite 5176`, `exit=0`. As seis chaves do `.env` com esses valores. O `estado.md` com `offset: 3` e `updated_by: jvbat@DESKTOP-U9PVHKH / opus`.

- [ ] **Step 3: Subir o stack da lane e ver o `/up` na 8083**

```bash
(cd "$L" && docker compose up -d)
(cd "$L" && docker compose exec -T app composer install --no-interaction --quiet)
curl -fsS -o /dev/null -w '%{http_code}\n' --retry 30 --retry-delay 2 --retry-all-errors http://localhost:8083/up
(cd "$L" && docker compose port nginx 80)
```

Expected: `200`, e `0.0.0.0:8083`. (A worktree nova não tem `backend/vendor`, por isso o `composer install` dentro do contêiner.)

- [ ] **Step 4: `fechar` recusado com a branch não mesclada, stack de pé**

```bash
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh fechar 33); echo "exit=$?"
(cd "$L" && docker compose ps --format '{{.Service}} {{.State}}')
```

Expected: `PORTAO RECUSOU: a branch chore/33-harness-sinal-de-contexto-cheio nao esta mesclada na main; fechar agora apagaria commits`, `exit=1`; os serviços continuam `running`.

- [ ] **Step 5: Mesclar a lane na `main` do clone (simula a PR) e fechar**

```bash
git -C "$PROVA/lotus" merge -q --no-ff chore/33-harness-sinal-de-contexto-cheio -m 'merge: lane 33 (simula a PR)'
(cd "$PROVA/lotus" && bash .claude/scripts/lane.sh fechar 33); echo "exit=$?"
```

Expected: a saída do `docker compose down -v --rmi local` e `LANE FECHADA: chore/33-harness-sinal-de-contexto-cheio, arvore … removida`, `exit=0`.

- [ ] **Step 6: Provar que nada sobrou**

```bash
P=lotus-33-harness-sinal-de-contexto-cheio
echo "conteineres: [$(docker ps -a --filter "label=com.docker.compose.project=$P" --format '{{.Names}}')]"
echo "volumes: [$(docker volume ls --filter "label=com.docker.compose.project=$P" --format '{{.Name}}')]"
echo "imagens: [$(docker image ls --filter "label=com.docker.compose.project=$P" --format '{{.Repository}}')]"
echo "redes: [$(docker network ls --filter "label=com.docker.compose.project=$P" --format '{{.Name}}')]"
git -C "$PROVA/lotus" worktree list
echo "branch: [$(git -C "$PROVA/lotus" branch --list 'chore/33-*')]"
ls -d "$L" 2>&1
```

Expected: `conteineres: []`, `volumes: []`, `imagens: []`, `redes: []`; o `worktree list` só com `lotus`, `lotus-antiga-1` e `lotus-antiga-2`; `branch: []`; `ls` com `No such file or directory`.

- [ ] **Step 7: Escrever a evidência**

Crie `docs/superpowers/audits/2026-09-26-item30-prova-lane.md` com um cabeçalho (data, commit da ponta do 30 usada — `git -C "$PROVA/lotus" log -1 --format=%h HEAD^2` do merge do Step 1 —, versões de `git`, `docker compose` e `pnpm`) e, para cada Step de 1 a 6, o comando e a **saída literal** colada em bloco de código. Termine com a linha do veredito: os sete itens do DoD da §4.6 que esta prova cobre, cada um com o Step que o mostra.

- [ ] **Step 8: Desmontar o clone**

```bash
git -C "$PROVA/lotus" worktree remove "$PROVA/lotus-antiga-1"
git -C "$PROVA/lotus" worktree remove "$PROVA/lotus-antiga-2"
rm -rf "$PROVA"
git -C /home/jvbat/projetos/lotus worktree list
```

Expected: o `worktree list` do repositório real igual ao de antes da prova (cinco árvores: `lotus`, `fix-frontend`, `lotus-harness`, `lotus-infra`, `lotus-preview`).

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/audits/2026-09-26-item30-prova-lane.md
git commit -m "docs(audit): abrir e fechar vistos rodar com stack real num clone descartavel"
```

---

### Task 10: A virada — `state.md` vira contrato

Um commit só (spec §7): não existe janela em que o hook novo conviva com o `state.md` velho.

**Files:**
- Modify: `.claude/hooks/session-start.sh`
- Modify: `.claude/tests/session-start.tests.sh`
- Modify: `.claude/tests/estados.tests.sh`
- Delete: `.claude/hooks/lib/ler-estado.py`
- Modify: `docs/superpowers/state.md`
- Modify: `docs/superpowers/historico/state-archive.md`
- Modify: `CLAUDE.md`
- Create: `docs/superpowers/blocos/30-harness-estado-por-bloco/estado.md`

**Interfaces:**
- Consumes: `lane.sh descobrir` (Task 2); `TOKEN_DO_ESTADO`, `coerencia_da_lane` (Task 8); os ajudantes de `_lane.sh`.
- Produces: `session-start.sh` com a saída `Harness de blocos. Lanes:`, uma linha por lane (`* NN [ws] branch em arvore (offset +N|sem offset) -> next_action`, `*` na da sessão), `Nenhuma lane viva.` quando não há, e as seções `ESTADO INCOERENTE — lane NN:`, `FECHAMENTO INTERROMPIDO — branch de lane sem worktree:` e `ARVORE ORFA — worktree fora do padrao de lane <tipo>/<NN>-<slug>:`. `state.md` com a seção `## Estados válidos` numa tabela `| \`estado\` | \`token\` | ação |` que a catraca lê.

- [ ] **Step 1: Escrever a catraca da tabela do contrato**

Acrescente ao fim de `.claude/tests/estados.tests.sh`:

```bash
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
```

- [ ] **Step 2: Reescrever o teste do `session-start`**

Substitua o conteúdo inteiro de `.claude/tests/session-start.tests.sh` por:

```bash
INICIO="$DIR_HOOKS/session-start.sh"
# shellcheck source=/dev/null
source "$DIR_TESTES/_lane.sh"

ss_payload() { jq -nc --arg cwd "$1" '{session_id:"teste", cwd:$cwd, source:"startup"}'; }

_ssm=$(criar_main_lane); registrar_descarte "$(dirname "$_ssm")"

# --- so o main tree
acionar_hook "$INICIO" "$(ss_payload "$_ssm")"
assert_igual 0 "$CODIGO_HOOK" 'session-start sai 0'
assert_contem "$SAIDA_HOOK" 'Nenhuma lane viva' 'sem lane, diz que nao ha nenhuma'
assert_contem "$SAIDA_HOOK" 'Esta sessao nao esta numa lane' 'o main tree nao e lane'
# Os tres alarmes precisam do sentido negativo: um hook que gritasse sempre
# passaria em toda asercao de presenca.
assert_nao_contem "$SAIDA_HOOK" 'ARVORE ORFA' 'sem orfa, sem alarme de orfa'
assert_nao_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' 'sem branch solta, sem alarme de fechamento'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE' 'fora de lane, sem alarme de coerencia'
assert_nao_contem "$SAIDA_HOOK" 'permissionDecision' 'SessionStart emite texto puro, nao JSON'

# --- duas lanes; a sessao roda na 31
_ss31=$(lane_manual "$_ssm" chore/31-harness-commands-de-bloco)
mkdir -p "$_ss31/docs/superpowers/plans"; : > "$_ss31/docs/superpowers/plans/p31.md"
escrever_estado_lane "$_ss31" 31-harness-commands-de-bloco executing continue_active_plan \
  chore/31-harness-commands-de-bloco 'active_plan: docs/superpowers/plans/p31.md' 'efeito_externo: nao'
_ss41=$(lane_manual "$_ssm" feat/41-livre-a)
# A 41 esta incoerente de proposito (token de outro estado): o alarme dela e
# da sessao dela, nao desta.
escrever_estado_lane "$_ss41" 41-livre-a planning request_code_review feat/41-livre-a
sed -i 's/^offset: 1$/offset: null/' "$_ss41/docs/superpowers/blocos/41-livre-a/estado.md"

acionar_hook "$INICIO" "$(ss_payload "$_ss31")"
assert_contem "$SAIDA_HOOK" \
  "* 31 [executing] chore/31-harness-commands-de-bloco em $_ss31 (offset +1) -> continue_active_plan" \
  'a lane da sessao sai com * e os campos do estado.md dela'
assert_contem "$SAIDA_HOOK" "  41 [planning] feat/41-livre-a em $_ss41 (sem offset) -> request_code_review" \
  'a outra lane sai sem *, e offset null vira sem offset'
assert_contem "$SAIDA_HOOK" 'Esta sessao e a lane 31' 'a saida diz qual e a lane da sessao'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE' 'incoerencia de OUTRA lane nao e alarme desta sessao'

# --- a mesma classe de incoerencia, agora na lane da sessao
escrever_estado_lane "$_ss31" 31-harness-commands-de-bloco executing request_code_review \
  chore/31-harness-commands-de-bloco 'active_plan: docs/superpowers/plans/p31.md' 'efeito_externo: nao'
acionar_hook "$INICIO" "$(ss_payload "$_ss31")"
assert_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE — lane 31' 'acusa a incoerencia da lane da sessao'
assert_contem "$SAIDA_HOOK" 'next_action' 'nomeia o campo incoerente'

# --- do main tree ninguem ganha *
acionar_hook "$INICIO" "$(ss_payload "$_ssm")"
assert_nao_contem "$SAIDA_HOOK" '* 31' 'do main tree, a 31 nao ganha *'
assert_nao_contem "$SAIDA_HOOK" '* 41' 'do main tree, a 41 nao ganha *'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO INCOERENTE' 'do main tree, nenhuma lane e conferida'

# --- orfa e fechamento interrompido
_ssorfa=$(lane_manual "$_ssm" preview/client)
git -C "$_ssm" branch -q fix/42-livre-b
acionar_hook "$INICIO" "$(ss_payload "$_ssm")"
assert_contem "$SAIDA_HOOK" 'ARVORE ORFA' 'acusa worktree fora do padrao'
assert_contem "$SAIDA_HOOK" "$_ssorfa em preview/client" 'a orfa e nomeada pela arvore e pela branch'
assert_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' 'acusa branch de lane sem worktree'
assert_contem "$SAIDA_HOOK" '42: a branch fix/42-livre-b' 'nomeia o numero e a branch'

# --- falha aberta
_ssfora=$(mktemp -d); registrar_descarte "$_ssfora"
acionar_hook "$INICIO" "$(ss_payload "$_ssfora")"
assert_igual '' "$SAIDA_HOOK" 'cwd fora de repositorio: nao relata nada'
acionar_hook "$INICIO" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao relata nada'
```

- [ ] **Step 3: Rodar e ver reprovar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em dois arquivos. `estados.tests.sh`: `a tabela do state.md espelha estados.sh` com `obtido` de dez linhas em que o "token" é a coluna de ação sem espaços (a tabela velha tem dez estados e nenhuma coluna de token) e `tem os doze estados` com `10`; as três sondas passam por acidente, porque a tabela velha já difere do mapa. `session-start.tests.sh`: o hook velho não acha `lanes:` no `state.md` do repositório descartável e fica mudo, então toda asserção de presença reprova.

- [ ] **Step 4: Reescrever o `session-start.sh`**

Substitua o conteúdo inteiro de `.claude/hooks/session-start.sh` por:

```bash
#!/usr/bin/env bash
# Injeta o estado real das lanes no inicio da sessao.
# A fonte e `lane.sh descobrir`: `git worktree list` mais o estado.md de cada
# lane, lido na arvore dela (spec 2026-09-26, 4.3). Nao ha mais estado central
# para comparar com o da arvore: cada bloco guarda o seu na propria pasta, e
# duas lanes nunca escrevem o mesmo arquivo.
# Contrato: SessionStart NUNCA bloqueia. Texto puro no stdout, exit 0.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"
# shellcheck source=/dev/null
source "$DIR/lib/estados.sh"

LANE="$DIR/../scripts/lane.sh"

corpo() {
  ler_payload
  local cwd raiz branch_atual head sujos
  cwd=$(campo '.cwd')
  [[ -z $cwd ]] && return 0
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  [[ -f $LANE ]] || return 0
  branch_atual=$(branch_de "$raiz")
  head=$(git -C "$raiz" rev-parse --short HEAD 2>/dev/null)
  sujos=$(git -C "$raiz" status --porcelain 2>/dev/null | wc -l)

  local -a linhas=() orfas=() interrompidas=() incoerencias=()
  local tipo a b c d e f marca offset problema minha='' n_lanes=0
  linhas+=('Harness de blocos. Lanes:' '')
  # Separador US, nao TAB: ver o docstring do ler-frontmatter.py.
  while IFS=$'\x1f' read -r tipo a b c d e f; do
    case $tipo in
      lane)
        # a=NN b=workflow_state c=branch d=arvore e=next_action f=offset
        n_lanes=$((n_lanes + 1))
        marca='  '
        if [[ $(realpath -m "$d") == "$(realpath -m "$raiz")" ]]; then
          marca='* '
          minha=$a
          # So a lane da sessao e conferida: as outras pertencem a outras
          # sessoes, e alarme que esta sessao nao pode resolver treina a
          # ignorar alarme.
          while IFS= read -r problema; do
            [[ -n $problema ]] && incoerencias+=("$problema")
          done < <(coerencia_da_lane "$raiz/docs/superpowers/blocos/${c#*/}/estado.md" \
                     "$branch_atual" "$raiz")
        fi
        if [[ -n $f ]]; then offset="offset +$f"; else offset='sem offset'; fi
        linhas+=("${marca}${a} [${b:-sem-estado}] ${c} em ${d} (${offset}) -> ${e:-sem-proxima-acao}")
        ;;
      orfa) orfas+=("$a em $b") ;;
      sem-arvore) interrompidas+=("$a: a branch $b existe e nao tem worktree") ;;
    esac
  done < <(cd "$raiz" && bash "$LANE" descobrir 2>/dev/null)
  (( n_lanes == 0 )) && linhas+=('  Nenhuma lane viva.')

  linhas+=('')
  linhas+=("Git agora: branch=$branch_atual HEAD=$head arquivos-modificados=$sujos")
  if [[ -n $minha ]]; then
    linhas+=("Esta sessao e a lane $minha (marcada com *). As demais pertencem a outras sessoes: nao mexa nelas.")
    linhas+=("Estado dela: docs/superpowers/blocos/${branch_atual#*/}/estado.md. Contrato: docs/superpowers/state.md.")
  else
    linhas+=('Esta sessao nao esta numa lane. As lanes acima pertencem a outras sessoes: nao mexa nelas.')
  fi
  linhas+=('HEAD a frente do campo commit e NORMAL: o estado so e reescrito em fronteira duravel.')
  linhas+=('Divergencia entre o estado, o plano, a spec e o git bloqueia a sessao: pare e relate.')

  local i
  if (( ${#incoerencias[@]} > 0 )); then
    linhas+=('' "ESTADO INCOERENTE — lane $minha:")
    for i in "${!incoerencias[@]}"; do linhas+=("  ${incoerencias[$i]}"); done
    linhas+=('Corrija o estado.md antes de seguir. Nao escolha fonte por heuristica.')
  fi
  if (( ${#interrompidas[@]} > 0 )); then
    linhas+=('' 'FECHAMENTO INTERROMPIDO — branch de lane sem worktree:')
    for i in "${!interrompidas[@]}"; do linhas+=("  ${interrompidas[$i]}"); done
    linhas+=('O merge pode ter acontecido e o fechamento nao. Nao apague a branch antes de conferir.')
  fi
  if (( ${#orfas[@]} > 0 )); then
    linhas+=('' 'ARVORE ORFA — worktree fora do padrao de lane <tipo>/<NN>-<slug>:')
    for i in "${!orfas[@]}"; do linhas+=("  ${orfas[$i]}"); done
  fi

  printf '%s\n' "${linhas[@]}"
  return 0
}

corpo || true
exit 0
```

- [ ] **Step 5: Apagar o `ler-estado.py`**

```bash
git rm -q .claude/hooks/lib/ler-estado.py
grep -rn 'ler-estado' .claude/ CLAUDE.md
```

Expected: um resultado só, `.claude/hooks/lib/ler-frontmatter.py:22`, a linha do docstring que conta por que o separador é o US. Nenhum código chama o arquivo (o único consumidor era o `session-start.sh` velho).

- [ ] **Step 6: Congelar o `state.md` velho no `state-archive.md`**

Antes de reescrever o `state.md`, desça-o inteiro para o arquivo, logo abaixo do cabeçalho (acima do primeiro `## Fechado em`). Rode:

```bash
python3 - <<'PY'
import pathlib
import re

estado = pathlib.Path("docs/superpowers/state.md")
arquivo = pathlib.Path("docs/superpowers/historico/state-archive.md")
velho = estado.read_text(encoding="utf-8")
m = re.match(r"\A---\n(.*?)\n---\n(.*)\Z", velho, re.S)
fm, corpo = m.group(1), m.group(2)
corpo = re.sub(r"^# Estado operacional — Lotus v2\n", "", corpo, count=1, flags=re.M)
corpo = re.sub(r"^(#{2,}) ", r"#\1 ", corpo, flags=re.M).strip("\n")
secao = (
    "## Congelado em 2026-09-26 — o `state.md` do fluxo antigo, na virada do item 30\n\n"
    "> Na virada do item 30 o `state.md` deixou de guardar lanes e virou contrato; o estado de\n"
    "> cada bloco passou a morar em `docs/superpowers/blocos/<NN>-<slug>/estado.md`. Abaixo, o\n"
    "> `state.md` como estava no commit anterior à virada — frontmatter e corpo, sem edição; os\n"
    "> cabeçalhos descem um nível. Depois do item 30 este arquivo não recebe narrativa nova: o\n"
    "> registro de bloco novo é a pasta dele. As lanes antigas que fecharem antes do merge do 30\n"
    "> (D6 da spec 2026-09-26) ainda escrevem aqui, pelo fluxo antigo, e o próprio 30 também.\n\n"
    "```yaml\n" + fm + "\n```\n\n" + corpo + "\n\n---\n\n"
)
texto = arquivo.read_text(encoding="utf-8")
ancora = "\n---\n\n## Fechado em "
i = texto.index(ancora) + len("\n---\n\n")
arquivo.write_text(texto[:i] + secao + texto[i:], encoding="utf-8")
PY
grep -n '^## ' docs/superpowers/historico/state-archive.md | head -3
```

Expected: a primeira seção `## ` passa a ser `## Congelado em 2026-09-26 — o \`state.md\` do fluxo antigo, na virada do item 30`, seguida de `## Fechado em 2026-09-25 — …`.

- [ ] **Step 7: Reescrever o `state.md` como contrato**

Substitua o conteúdo inteiro de `docs/superpowers/state.md` por:

```markdown
# Estado — contrato

Este arquivo é o **contrato** dos estados válidos, dos campos e das invariantes do `estado.md` de
cada bloco. Ele não guarda o estado de bloco nenhum: o de cada um vive em
`docs/superpowers/blocos/<NN>-<slug>/estado.md`, na pasta do bloco, na árvore da lane. A lista de
lanes vivas agora mesmo sai de `bash .claude/scripts/lane.sh descobrir` — que é o que o
`SessionStart` mostra no início de toda sessão.

## Lane

Uma lane é uma worktree irmã, `../lotus-<NN>-<slug>`, numa branch que casa
`^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$`. O número é o da ficha do
`backlog.md`; a pasta do bloco é `blocos/<NN>-<slug>/`. Branch fora do padrão não é lane.

- **O main tree fica sempre na `main` e nunca é lane.** Ele planeja, abre e fecha lane
  (`lane.sh abrir` e `lane.sh fechar`) e escreve o `backlog.md`.
- **No máximo três lanes.** Cada uma publica as portas do offset que o `abrir` reservou no `.env`
  da raiz dela: +1, +2 ou +3, pela tabela do `.env.example`. O `abrir` conta como ocupado o
  offset de toda árvore do `git worktree list`, lane ou não.

## Estados válidos

| Estado | Token do `next_action` | Próxima ação permitida |
|---|---|---|
| `idle` | `select_backlog_item` | escolher explicitamente um item do `backlog.md` |
| `context_required` | `generate_context_packet` | gerar o Context Packet com `lotus-context-packet` |
| `ready_for_planning` | `plan_active_work_item` | executar `/planejar-bloco` para o bloco |
| `planning` | `continue_active_planning` | continuar brainstorming, spec e plano; **não implementar** |
| `ready_for_execution` | `execute_active_plan` | executar `/executar-bloco` para o bloco |
| `executing` | `continue_active_plan` | retomar a task pendente do plano; **não replanejar** |
| `ready_for_review` | `request_code_review` | pedir o code review do bloco |
| `reviewing` | `approve_review_findings` | tratar só os achados aprovados e repetir o review |
| `ready_for_closure` | `close_active_work_item` | fechar o bloco |
| `closing` | `answer_integration_menu` | responder ao menu de integração e verificar o merge |
| `blocked` | `resolve_blocker` | resolver o `blocker`; depois voltar a `resume_state` |
| `closed` | `none` | nenhuma: o bloco terminou e o `estado.md` é só o registro dele |

A **primeira palavra** do `next_action` é o token do estado; texto livre pode seguir depois de um
espaço. Texto com `#` vai entre aspas, porque o YAML lê ` #` como início de comentário:
`next_action: "close_active_work_item PR #120 aberto"`. O mapa estado → token vive uma vez em
código, em `.claude/hooks/lib/estados.sh`, e esta tabela o espelha: `.claude/tests/estados.tests.sh`
reprova a divergência nos dois sentidos.

### Entrar e sair de `blocked`

Quando um impedimento externo para o trabalho, grave `workflow_state: blocked`, `resume_state` com
o estado de onde se está saindo, `blocker` com uma linha que descreve o impedimento,
`next_owner: joao` e `next_action: resolve_blocker`, seguido do que falta. Para sair, confirme que o
`blocker` foi resolvido, copie `resume_state` de volta para `workflow_state`, zere `blocker` e
`resume_state` e troque o `next_action` pelo token do estado retomado. Nos dois sentidos vale a
invariante 9. Enquanto o bloco está em `blocked`, as regras de "a partir de" (invariantes 3, 4 e
12) usam o `resume_state` como régua. O item 32 acrescenta um caminho automático: aceitação externa
pendente depois do merge.

## Campos (`schema_version: 3`)

| Campo | Significado |
|---|---|
| `schema_version` | `3` nesta versão |
| `id` | número da ficha no `backlog.md`, como ela o escreve (`30`, sem zero à esquerda) |
| `slug` | nome da pasta do bloco, `<NN>-<resto>` (`30-harness-estado-por-bloco`); a branch é `<tipo>/<slug>` |
| `workflow_state` | um dos doze estados acima |
| `next_owner` | quem tem a bola: `joao`, `claude` ou `codex` |
| `next_action` | começa pelo token do estado; texto livre depois de um espaço |
| `resume_state` | estado para onde voltar ao sair de `blocked`; `null` fora dele |
| `active_spec` | caminho da spec, relativo à raiz da árvore |
| `active_plan` | caminho do plano; obrigatório a partir de `ready_for_execution` |
| `active_review` | caminho do `revisao.md`; obrigatório a partir de `ready_for_closure` |
| `active_acceptance` | caminho do `aceitacao.md` (item 32); `null` quando `efeito_externo` é `nao` |
| `context_packet` | caminho do Context Packet, quando o bloco exige contexto externo |
| `efeito_externo` | `sim` quando o resultado depende de ação fora do repositório, `nao` caso contrário. `null` é a semente do `lane.sh abrir` e **nunca** vale `nao` |
| `executor` | quem executa o plano, copiado do `## Handoff de execução` dele: `claude` ou `codex` |
| `branch` | branch da lane |
| `worktree` | caminho da árvore da lane, relativo ao main tree |
| `offset` | offset de porta da lane, de 1 a 3; `null` em lane aberta antes do `lane.sh` |
| `lane_base` | SHA curto da `main` de onde a lane saiu |
| `commit` | `git rev-parse --short HEAD` no momento em que o arquivo foi escrito |
| `blocker` | uma linha que descreve o impedimento; `null` fora de `blocked` |
| `updated_at` | ISO-8601 com offset |
| `updated_by` | `<usuario>@<host> / <modelo>`: `id -un`, `hostname -s` e o alias do modelo, ou `terminal` quando o João roda o script à mão |

## Invariantes

1. **No máximo três lanes vivas.** Cada lane é um bloco, uma branch `<tipo>/<NN>-<slug>` e uma
   worktree irmã, conduzida por uma sessão própria. Abrir lane passa pelo portão do
   `lane.sh abrir`: nada de quarta lane, nada de dois blocos que dependem um do outro (pela linha
   `**Depende:**` das fichas, transitivamente, nos dois sentidos) e nada de porta repetida. O
   `lane.sh conferir` acusa dois planos vivos que tocam os mesmos arquivos.
2. **`next_action` começa pelo token do `workflow_state`.** Se não começar, o arquivo está
   corrompido: pare, relate e reconstrua a partir do git e dos artefatos do bloco. O `SessionStart`
   acusa isso como `ESTADO INCOERENTE`.
3. `active_plan` é obrigatório a partir de `ready_for_execution`.
4. `active_review` é obrigatório a partir de `ready_for_closure`.
5. Quando o bloco depende de contexto externo ao repositório, ele entra em `context_required`, com
   `context_packet: null`, e o packet se torna obrigatório antes da transição para
   `ready_for_planning`.
6. **Mudanças de estado ocorrem somente em fronteiras duráveis** e entram no mesmo commit do
   artefato que prova a transição. O estado mora na pasta do bloco, e é essa localização que impede
   duas lanes de colidirem no mesmo arquivo de estado.
7. **Divergência bloqueia a sessão.** Quando o `estado.md`, o plano, a spec, o Git ou o
   `backlog.md` discordarem, pare e relate. Não escolha fonte por heurística e não "conserte" o
   arquivo para o que parece mais provável.
8. **O backlog nunca promove trabalho automaticamente.** Abrir lane para uma ficha é sempre escolha
   explícita do João.
9. Quem altera um `estado.md` atualiza, no mesmo arquivo, `updated_at`, `updated_by` e `commit`.
10. **`backlog.md` é escrito somente pelo main tree, na `main`.** É o último arquivo compartilhado
    entre lanes, e a regra o mantém livre de conflito.
11. **Bloco com `efeito_externo: sim` não vai a `closed` sem a prova do efeito externo
    registrada.** `closed` significa resultado verificado, não código na `main`. O registro é o
    `aceitacao.md` que o item 32 introduz; até ele, a prova vai no fechamento.
12. **`efeito_externo` é obrigatório a partir de `ready_for_execution`.** Quem grava `sim` ou `nao`
    é o planejamento; o `lane.sh abrir` só semeia `null`. `null` num bloco que já passou dali é
    divergência pela invariante 7, e o `SessionStart` a acusa. Ler `null` como `nao` desligaria a
    invariante 11 sem ninguém ter decidido isso.

## Histórico

Os blocos do fluxo antigo têm uma linha cada em `historico/progress.md` e a narrativa em
`historico/state-archive.md`, que recebeu o `state.md` antigo inteiro na virada do item 30 e depois
dele congela. Bloco novo: a pasta `blocos/<NN>-<slug>/` é o registro, e o `progress.md` ganha a
linha dele no fechamento.

## Transição

Até o item 31 mesclar, os commands e skills (`/planejar-bloco`, `/executar-bloco`,
`revisar-sprint`, `fechar-sprint` e `.agents/skills/`) ainda citam `state.md`, `lanes:`,
`focused_lane` e os campos singulares do topo. Leia "o `estado.md` do bloco" onde eles dizem
`state.md`, e "o bloco" onde dizem lane em foco ou `active_work_item`. O `estado.md` do 31 e o do
32 são semeados à mão, porque o `lane.sh abrir` exige o main tree na `main` (spec 2026-09-26, §7).
```

- [ ] **Step 8: Semear o `estado.md` do 30**

```bash
mkdir -p docs/superpowers/blocos/30-harness-estado-por-bloco
MODELO=opus   # alias do modelo que executa esta task: opus ou sonnet
BASE_COMMIT=$(git rev-parse --short HEAD)
cat > docs/superpowers/blocos/30-harness-estado-por-bloco/estado.md <<ESTADO
---
schema_version: 3
id: 30
slug: 30-harness-estado-por-bloco
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
resume_state: null
active_spec: docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md
active_plan: docs/superpowers/plans/2026-09-26-harness-estado-por-bloco.md
active_review: null
active_acceptance: null
context_packet: null
efeito_externo: nao
executor: claude
branch: chore/30-harness-estado-por-bloco
worktree: ../lotus-harness
offset: null
lane_base: 65d81bc9
commit: $BASE_COMMIT
blocker: null
updated_at: $(date -Iseconds)
updated_by: $(id -un)@$(hostname -s) / $MODELO
---

# Bloco 30 — estado

Migrado do \`state.md\` na virada (Task 10 do plano). Até aqui o 30 rodou pelo fluxo antigo, com a
\`lane-a\`; a narrativa dele até a virada está em \`historico/state-archive.md\`, seção
"Congelado em 2026-09-26". Spec e plano ficam nos caminhos legados, porque o bloco nasceu antes da
pasta. \`offset: null\`: a lane foi aberta antes do \`lane.sh\` e não sobe stack.
ESTADO
```

Ajuste `MODELO` se quem executa não for o `opus`. O `commit` é o HEAD **antes** do commit da virada, pela invariante 9.

- [ ] **Step 9: Atualizar o `CLAUDE.md` §3 e as duas menções vizinhas**

Em `CLAUDE.md`, troque o bloco

```markdown
- **SEMPRE, PRIMEIRO:** `docs/superpowers/state.md` — fonte única da etapa atual, do trabalho
  ativo e da próxima ação permitida. Não deduza fase por commits, existência de arquivos, ordem do
  backlog ou texto do `progress.md`.
```

por

```markdown
- **SEMPRE, PRIMEIRO:** a saída do `SessionStart` — quais lanes existem, em que estado e qual é a
  desta sessão (marcada com `*`); a qualquer momento, `bash .claude/scripts/lane.sh descobrir` dá o
  mesmo inventário. **Depois, o `estado.md` da lane**, em `docs/superpowers/blocos/<NN>-<slug>/` —
  fonte única da etapa do bloco e da próxima ação permitida. O contrato dos estados, dos campos e
  das invariantes é `docs/superpowers/state.md`. Não deduza fase por commits, existência de
  arquivos, ordem do backlog ou texto do `progress.md`.
```

Troque `- **EM SEGUIDA, PELOS PONTEIROS DO ESTADO:** leia` por `- **EM SEGUIDA, PELOS PONTEIROS DO \`estado.md\`:** leia`.

Troque

```markdown
- **SÓ QUANDO O ESTADO EXIGIR:** `docs/superpowers/backlog.md` — fila futura, usada apenas em
  `idle`, planejamento, fechamento ou por solicitação explícita do João.
```

por

```markdown
- **SÓ QUANDO O ESTADO EXIGIR:** `docs/superpowers/backlog.md` — fila futura, usada no main tree:
  para abrir lane, no planejamento, no fechamento ou por solicitação explícita do João.

> **Transição até o item 31 mesclar:** os commands e skills ainda dizem `state.md`, `lanes:` e
> `focused_lane`. Leia "o `estado.md` do bloco" onde eles dizem `state.md` (`state.md`,
> seção Transição).
```

Troque o bloco do layout

```markdown
> **Layout de `docs/superpowers/`:** na raiz vivem só os dois arquivos que decidem — `state.md`
> (etapa atual) e `backlog.md` (fila). O resto mora em pasta: `pendencias/` (`README.md` é o índice,
> `abertas.md` a ficha de cada uma, `encerradas.md` o rastro de 1 sprint), `historico/`
> (`progress.md`, `progress-archive.md` e `state-archive.md` — a narrativa dos blocos já fechados,
> que sai do `state.md` no fechamento), `plans/`, `specs/`, `context-packets/` e `audits/`.
> **O `state.md` guarda o bloco ativo e ponteiro de uma linha para os cinco últimos fechados.**
> Ler narrativa de bloco encerrado é escolha explícita, não custo fixo de toda sessão.
```

por

```markdown
> **Layout de `docs/superpowers/`:** na raiz vivem só os dois arquivos que decidem — `state.md`
> (o contrato dos estados) e `backlog.md` (a fila, escrita só pelo main tree). Cada bloco aberto
> pelo `lane.sh` tem a pasta `blocos/<NN>-<slug>/`, com o `estado.md` e os artefatos dele. O resto
> mora em pasta: `pendencias/` (`README.md` é o índice, `abertas.md` a ficha de cada uma,
> `encerradas.md` o rastro de 1 sprint), `historico/` (`progress.md`, `progress-archive.md` e
> `state-archive.md` — a narrativa dos blocos do fluxo antigo, congelada na virada do item 30),
> `plans/`, `specs/`, `context-packets/` e `audits/` (legado: bloco novo escreve na própria pasta).
> **Nenhum arquivo guarda o estado de todas as lanes:** o inventário sai do `git worktree list`.
> Ler narrativa de bloco encerrado é escolha explícita, não custo fixo de toda sessão.
```

Troque

```markdown
> **Conflito de estado:** se `state.md`, packet, spec, plano, Git ou `progress.md` divergirem sobre
> a etapa atual, PARE. Não escolha por heurística. Mostre a divergência e corrija o estado antes de
> continuar.
```

por

```markdown
> **Conflito de estado:** se o `estado.md` da lane, packet, spec, plano, Git ou `progress.md`
> divergirem sobre a etapa atual, PARE. Não escolha por heurística. Mostre a divergência e corrija o
> estado antes de continuar. A incoerência mecânica o `SessionStart` já acusa, como
> `ESTADO INCOERENTE`.
```

No §4, troque `próprios comandos conforme \`state.md\`;` por `próprios comandos conforme o \`estado.md\` do bloco;`.

No §6, troque `Cada árvore de trabalho escolhe o seu offset no \`.env\` da raiz (molde em \`.env.example\`),` por `Cada árvore de trabalho tem o seu offset no \`.env\` da raiz (molde em \`.env.example\`; o \`lane.sh abrir\` reserva e escreve o de cada lane),`.

- [ ] **Step 10: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: nenhuma `FALHA`; `OK: 13 arquivo(s) de teste, nenhuma falha`. Em `estados.tests.sh`, as três linhas `a catraca reprova a tabela com estado falta|token|sobra` em `ok`.

- [ ] **Step 11: Ver a catraca reprovar de verdade contra o arquivo real**

Prove no sentido do código (lição 10), com cópia no scratchpad e nunca com `git stash`:

```bash
S=$(mktemp -d "${TMPDIR:-/tmp}/lotus-sonda-30.XXXXXX")
cp .claude/hooks/lib/estados.sh "$S/estados.sh.bak"
sed -i 's/\[idle\]=select_backlog_item/[idle]=select_backlog/' .claude/hooks/lib/estados.sh
bash .claude/tests/run-all.sh | grep -E 'FALHA|^FALHOU'
cp "$S/estados.sh.bak" .claude/hooks/lib/estados.sh && rm -rf "$S"
git diff --quiet .claude/hooks/lib/estados.sh && echo restaurado
```

Expected: `FALHA a tabela do state.md espelha estados.sh` e `FALHOU: 1 asercao(oes)` — mais a linha `FALHA …/ruim.sh saiu com codigo 3`, que o `_assert.tests.sh` imprime de propósito e não conta; depois `restaurado`. (A sonda mexe no `idle` e não no `closed` de propósito: a sonda interna `token` já troca o `closed`, e as duas juntas se anulariam.)

- [ ] **Step 12: Ver o `SessionStart` novo no repositório real**

```bash
jq -nc --arg cwd "$PWD" '{session_id:"prova", cwd:$cwd, source:"startup"}' | bash .claude/hooks/session-start.sh
```

Expected: a linha `* 30 [ready_for_review] chore/30-harness-estado-por-bloco em /home/jvbat/projetos/lotus-harness (sem offset) -> request_code_review`; `Esta sessao e a lane 30`; **nenhum** `ESTADO INCOERENTE`; `ARVORE ORFA` listando `fix-frontend`, `lotus-infra` e `lotus-preview` — as lanes antigas, fora do padrão, o que é verdade sob o contrato novo; nenhum `FECHAMENTO INTERROMPIDO`.

- [ ] **Step 13: Commit da virada**

```bash
git add .claude/hooks/session-start.sh .claude/tests/session-start.tests.sh .claude/tests/estados.tests.sh \
  docs/superpowers/state.md docs/superpowers/historico/state-archive.md CLAUDE.md \
  docs/superpowers/blocos/30-harness-estado-por-bloco/estado.md
git status --short
git commit -m "feat(harness): vira o estado para a pasta do bloco; state.md vira contrato (item 30)"
```

Expected do `git status --short` antes do commit: os sete arquivos acima e `D  .claude/hooks/lib/ler-estado.py`, nada fora disso.

---

## Definition of Done

1. `bash .claude/tests/run-all.sh` termina em `OK: 13 arquivo(s) de teste, nenhuma falha`.
2. O portão recusa a quarta lane, a dependência transitiva nos dois sentidos, a ficha sem `**Depende:**` e o offset ocupado por árvore que não é lane — provado em `lane-abrir.tests.sh`.
3. `abrir` e `fechar` vistos rodar de verdade: lane real em +3 com `/up` 200 na 8083, `fechar` recusado com branch não mesclada, e depois do merge nada sobra — contêiner, volume, imagem, rede, worktree ou branch (`audits/2026-09-26-item30-prova-lane.md`).
4. Na `main`, o guarda libera as quatro formas do `lane.sh` e nega `fechar --force` e todo o resto de `bash` — provado em `classificar-comando.tests.sh` e fim a fim em `guard-main-shell.tests.sh`.
5. A catraca `state.md` × `estados.sh` foi vista reprovar pelo lado do código (Task 10, Step 11) e tem as três sondas do lado da tabela dentro da suíte.
6. O `SessionStart` real em `../lotus-harness` mostra `* 30 [ready_for_review]` sem `ESTADO INCOERENTE` (Task 10, Step 12).
7. O `ler-estado.py` não existe mais, e nenhum código o chama; a única menção em `.claude/` é a história do separador no docstring do `ler-frontmatter.py`.

## Handoff de execução

```yaml
executor: claude
```

**Critério.** As Tasks 1–8 são mecânicas, com código pronto e verificação executável, o que normalmente pediria `codex`. Três coisas decidem contra. A Task 7 mexe na allowlist do guarda da `main`, onde um erro falha **aberto** e passa por uma suíte verde. A Task 9 exige julgamento sobre um stack real (porta ocupada, `composer install`, leitura de `docker ps`) e para se a 8083 não estiver livre. A Task 10 é a virada de estado do próprio harness que governa as sessões seguintes, com a transição do bloco acontecendo dentro dela (spec §7). Nenhuma lei do `CLAUDE.md` §5 é tocada.
