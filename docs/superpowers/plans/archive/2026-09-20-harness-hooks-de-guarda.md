# Harness de hooks de guarda — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar no Lotus cinco hooks de guarda do Claude Code em bash, mais a suíte que prova cada um nos dois sentidos.

**Architecture:** Cada hook é um script bash curto que lê o payload JSON do stdin, resolve a raiz do repositório pelo `git rev-parse` do `cwd` do payload e emite a decisão em JSON pelo stdout, sempre com `exit 0`. A lógica que não cabe em bash mora em dois módulos Python de biblioteca — o classificador de comando de shell e o leitor de frontmatter — que não tocam stdin nem git e por isso são testáveis sozinhos. A suíte é um runner bash próprio que monta um repositório git descartável por caso.

**Tech Stack:** bash 5 (WSL), `jq` 1.8.2, `python3` da distribuição (stdlib + PyYAML 6.0.1), `git`.

**Spec:** [`docs/superpowers/specs/2026-09-20-harness-hooks-de-guarda-design.md`](../specs/2026-09-20-harness-hooks-de-guarda-design.md)

## Global Constraints

- Nenhuma dependência nova. `python3 -m pip` não existe nesta máquina; o classificador usa só a stdlib e o leitor de estado usa PyYAML 6.0.1, já instalado.
- Todo hook termina em `exit 0` incondicional. **Nunca `exit 2`** — `exit 2` mata a sessão em vez de negar a ferramenta.
- Nenhum hook usa `set -e`. O corpo vive em uma função chamada com `|| true`.
- Todo JSON de saída é montado com `jq -n --arg`, nunca com `echo` e aspas à mão: os motivos citam caminhos, e um deles é `INSTRUÇÕES-DO-PROJETO.md`.
- A raiz que decide política vem **sempre** de `git rev-parse --show-toplevel` executado no `cwd` do payload. `CLAUDE_PROJECT_DIR` só é usado no `settings.json`, para localizar o arquivo do script.
- Erro de infraestrutura falha **aberta** (sai 0, mudo). Comando inclassificável falha **fechada** (nega).
- Nada nos testes toca o repositório real. Em particular, nada de `git stash`: a pilha tem stashes alheios.
- Trabalho todo dentro de `.claude/`. Nenhum arquivo é criado fora dela.
- Árvore de trabalho: `../lotus-harness`, branch `chore/harness-hooks-de-guarda`, aberta de `origin/main@618f390a`.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `.claude/settings.json` | registra os cinco hooks nos matchers; nada mais |
| `.claude/hooks/lib/comum.sh` | ler stdin, resolver raiz e branch, emitir JSON. Nenhuma política |
| `.claude/hooks/lib/classificar-comando.py` | a allowlist de comando de shell. Não toca git nem stdin |
| `.claude/hooks/lib/ler-estado.py` | frontmatter do `state.md` em linhas legíveis por bash |
| `.claude/hooks/guard-main.sh` | política de escrita por caminho e por árvore |
| `.claude/hooks/guard-main-shell.sh` | casca do classificador: decide se ele é chamado |
| `.claude/hooks/guard-secrets.sh` | peneira de nome e de conteúdo |
| `.claude/hooks/session-start.sh` | varre as árvores, lê o estado de cada uma, relata |
| `.claude/hooks/stop-verify.sh` | cobra evidência de verificação ao encerrar |
| `.claude/tests/_assert.sh` | asserções, repositório descartável, acionamento de hook |
| `.claude/tests/run-all.sh` | roda tudo, imprime veredito, sai 1 se falhou |
| `.claude/tests/*.tests.sh` | um por hook, mais o unitário do classificador |

---

### Task 1: Arcabouço de teste

O arcabouço vem primeiro porque todas as outras tasks são TDD sobre ele.

**Files:**
- Create: `.claude/tests/_assert.sh`
- Create: `.claude/tests/run-all.sh`
- Test: `.claude/tests/_assert.tests.sh`

> `_assert.tests.sh` é um **acréscimo** aos seis arquivos do §9 da spec. Justificativa: o asserter é código, e o bug que o original apanhou (contenção tratada como glob, crase virando escape) mora exatamente nele. Helper de teste não testado é o único lugar onde uma falha fica invisível.

**Interfaces:**
- Produces: `contem_literal texto trecho` (predicado puro, código 0 = contém); `assert_igual esperado obtido titulo`; `assert_contem texto trecho titulo`; `assert_nao_contem texto trecho titulo`; `criar_repo` (ecoa o caminho de um repositório descartável); `registrar_descarte caminho`; `acionar_hook caminho_do_hook payload` (seta `SAIDA_HOOK` e `CODIGO_HOOK`); `campo_json texto filtro_jq`; `payload_escrita cwd file_path content`; `payload_bash cwd comando`; variáveis `DIR_TESTES`, `DIR_HOOKS`; contador `FALHAS_TESTE`.

- [ ] **Step 1: Escrever o teste do asserter**

Crie `.claude/tests/_assert.tests.sh`:

```bash
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL — `bash: .claude/tests/run-all.sh: No such file or directory`

- [ ] **Step 3: Escrever `_assert.sh`**

```bash
# Asserter minimo da suite do harness. Sem dependencia externa.
# O contador e global porque run-all.sh faz `source` de cada arquivo de teste,
# e nao um subshell: variavel setada dentro do teste sobrevive.

DIR_TESTES=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
DIR_HOOKS=$(cd -- "$DIR_TESTES/../hooks" && pwd)
FALHAS_TESTE=${FALHAS_TESTE:-0}
REPOS_DESCARTAVEIS=()

contem_literal() {
  # Contencao LITERAL, sem caixa, de $2 dentro de $1. As aspas em torno de
  # "$trecho" dentro do padrao sao o que o torna literal: sem elas, * e ?
  # do trecho virariam curinga.
  local texto=${1,,}
  local trecho=${2,,}
  [[ $texto == *"$trecho"* ]]
}

assert_igual() {
  local esperado=$1 obtido=$2 titulo=$3
  if [[ $esperado == "$obtido" ]]; then
    printf '  ok    %s\n' "$titulo"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s\n' "$titulo"
    printf '          esperado: [%s]\n' "$esperado"
    printf '          obtido:   [%s]\n' "$obtido"
  fi
}

assert_contem() {
  local texto=$1 trecho=$2 titulo=$3
  if contem_literal "$texto" "$trecho"; then
    printf '  ok    %s\n' "$titulo"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s\n' "$titulo"
    printf '          nao contem: [%s]\n' "$trecho"
    printf '          no texto:   [%s]\n' "$texto"
  fi
}

assert_nao_contem() {
  local texto=$1 trecho=$2 titulo=$3
  if contem_literal "$texto" "$trecho"; then
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA %s\n' "$titulo"
    printf '          nao devia conter: [%s]\n' "$trecho"
    printf '          no texto:         [%s]\n' "$texto"
  else
    printf '  ok    %s\n' "$titulo"
  fi
}

criar_repo() {
  # Repositorio descartavel para um caso de teste. Ecoa o caminho.
  local raiz
  raiz=$(mktemp -d "${TMPDIR:-/tmp}/lotus-hooks-teste.XXXXXX")
  git -C "$raiz" init -q -b main
  git -C "$raiz" config user.email harness@lotus.local
  git -C "$raiz" config user.name 'Harness de teste'
  git -C "$raiz" commit -q --allow-empty -m base
  mkdir -p "$raiz/docs" "$raiz/backend" "$raiz/frontend" "$raiz/.claude/hooks"
  printf '%s\n' "$raiz"
}

registrar_descarte() { REPOS_DESCARTAVEIS+=("$1"); }

limpar_descartes() {
  local r
  for r in "${REPOS_DESCARTAVEIS[@]}"; do
    [[ -n $r && -d $r ]] && rm -rf "$r"
  done
  REPOS_DESCARTAVEIS=()
}

acionar_hook() {
  # $1 = caminho do hook, $2 = payload JSON. Seta SAIDA_HOOK e CODIGO_HOOK.
  local hook=$1 payload=$2
  SAIDA_HOOK=$(printf '%s' "$payload" | bash "$hook" 2>/dev/null)
  CODIGO_HOOK=$?
}

campo_json() {
  # $1 = texto (pode ser vazio), $2 = filtro jq. Ecoa vazio se nao for JSON.
  [[ -z $1 ]] && return 0
  printf '%s' "$1" | jq -r "$2 // \"\"" 2>/dev/null
}

payload_escrita() {
  # $1 = cwd, $2 = file_path, $3 = content (pode ser vazio)
  jq -nc --arg cwd "$1" --arg fp "$2" --arg ct "$3" \
    '{session_id:"teste", cwd:$cwd, tool_name:"Write",
      tool_input:({file_path:$fp} + (if $ct=="" then {} else {content:$ct} end))}'
}

payload_bash() {
  jq -nc --arg cwd "$1" --arg cmd "$2" \
    '{session_id:"teste", cwd:$cwd, tool_name:"Bash", tool_input:{command:$cmd}}'
}
```

- [ ] **Step 4: Escrever `run-all.sh`**

```bash
#!/usr/bin/env bash
# Roda toda a suite do harness. Veredito: ultima linha e codigo de saida.

dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
FALHAS_TESTE=0
# shellcheck source=/dev/null
source "$dir/_assert.sh"

arquivos=("$dir"/*.tests.sh)
for a in "${arquivos[@]}"; do
  printf '== %s\n' "$(basename "$a")"
  # shellcheck source=/dev/null
  source "$a"
done
limpar_descartes

printf '\n'
if (( FALHAS_TESTE > 0 )); then
  printf 'FALHOU: %d asercao(oes)\n' "$FALHAS_TESTE"
  exit 1
fi
printf 'OK: %d arquivo(s) de teste, nenhuma falha\n' "${#arquivos[@]}"
exit 0
```

- [ ] **Step 5: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== _assert.tests.sh`, oito linhas `ok`, e `OK: 1 arquivo(s) de teste, nenhuma falha`

- [ ] **Step 6: Commit**

```bash
git add .claude/tests/_assert.sh .claude/tests/run-all.sh .claude/tests/_assert.tests.sh
git commit -m "test(harness): arcabouco da suite de hooks"
```

---

### Task 2: Classificador — varredura e família de leitura

**Files:**
- Create: `.claude/hooks/lib/classificar-comando.py`
- Test: `.claude/tests/classificar-comando.tests.sh`

**Interfaces:**
- Produces: o executável `lib/classificar-comando.py`. Contrato: `argv[1]` é a linha de comando, `LOTUS_RAIZ` (opcional) é a raiz do repositório. `exit 0` com stdout vazio = liberado; `exit 0` com motivo no stdout = negado; `exit != 0` = a casca nega com motivo genérico.
- Produces (interno, para as Tasks 3 e 4): `negar(motivo)` levanta `Negado`; `classificar_simples(tokens)` despacha por família; `desaspar(token)`; `RAIZ`.

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/classificar-comando.tests.sh`:

```bash
# Unitario puro: o classificador nao toca git nem stdin.
CLASSIF="$DIR_HOOKS/lib/classificar-comando.py"

classificar() { LOTUS_RAIZ=/repo python3 "$CLASSIF" "$1" 2>&1; }

assert_libera() {
  local saida; saida=$(classificar "$1")
  assert_igual '' "$saida" "libera: $1"
}
assert_nega() {
  local saida; saida=$(classificar "$1")
  if [[ -n $saida ]]; then
    printf '  ok    nega: %s\n' "$1"
  else
    FALHAS_TESTE=$((FALHAS_TESTE + 1))
    printf '  FALHA nega: %s\n          liberou em vez de negar\n' "$1"
  fi
}

# --- varredura: redirecionamento
assert_libera 'pnpm test 2>/dev/null'
assert_libera 'pnpm test 2>&1'
assert_libera 'docker compose logs app 2>&1 | tail -20'
assert_nega   'echo oi > arquivo.txt'
assert_nega   'cat a >> b'
assert_nega   'pnpm build &> saida.log'

# --- varredura: aspas e substituicao
assert_libera 'cat "arquivo com espaco.txt"'
assert_libera 'echo ">"'
assert_libera "echo '\$(rm -rf /)'"
assert_libera 'git log -1 $(git rev-parse HEAD)'
assert_nega   'git log -1 $(rm -rf /)'
assert_nega   'diff <(ls) <(ls -a)'
assert_nega   "echo 'aspas abertas"

# --- varredura: atribuicao e nome nao literal
assert_nega   'GIT_EXTERNAL_DIFF=/tmp/x git diff'
assert_nega   '$CMD --tudo'

# --- familia de leitura
assert_libera 'ls -la docs'
assert_libera 'grep -rn "padrao" backend/app'
assert_libera 'sed -n "1,20p" README.md'
assert_libera 'cat a.txt | grep -n foo | wc -l'
assert_nega   'sed -i "s/a/b/" README.md'
assert_nega   'find . -name "*.tmp" -delete'
assert_nega   'find . -name x -exec rm {} ;'
assert_nega   'tee saida.txt'
assert_nega   'ls | xargs rm'
assert_nega   'bash script.sh'
assert_nega   'python3 -c "print(1)"'
assert_nega   'node -e "process.exit(0)"'
assert_nega   'npx eslint .'
assert_nega   'comandoquenaoexiste --flag'
assert_nega   './vendor/bin/pint app/Models'
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL — cada `assert_libera` reporta o texto de `python3: can't open file`, e os `assert_nega` passam por acidente. É esperado: o arquivo não existe.

- [ ] **Step 3: Escrever a varredura e a família de leitura**

Crie `.claude/hooks/lib/classificar-comando.py`:

```python
#!/usr/bin/env python3
"""Classifica um comando de shell contra a allowlist da branch main do Lotus.

Contrato:
  argv[1]     a linha de comando
  LOTUS_RAIZ  raiz do repositorio (opcional; so o pdftoppm usa)

  exit 0 + stdout vazio  -> liberado
  exit 0 + motivo        -> negado
  exit != 0              -> a casca nega com motivo generico (falha fechada)

O harness de origem resolvia isto pelo AST do PowerShell. Bash nao tem
equivalente, entao a descida em substituicao de comando, que o AST dava de
graca, e escrita a mao em varrer().
"""

import os
import re
import shlex
import sys

RAIZ = os.environ.get("LOTUS_RAIZ", "")
SUBST = "__SUBSTITUICAO__"
REDIR_OK = re.compile(r">&1(?=\s|$)|>{1,2}\s*/dev/null(?=\s|$)")
OPERADORES = {"|", "||", "&&", ";", ";;", "&", "\n"}

LEITURA = {
    "ls", "cat", "head", "tail", "grep", "rg", "find", "wc", "sort", "uniq",
    "cut", "tr", "diff", "jq", "stat", "file", "realpath", "basename",
    "dirname", "pwd", "echo", "printf", "date", "tree", "sed", "pdfinfo",
    "pdftoppm",
}

# Portas de execucao arbitraria ou de escrita, negadas sob qualquer forma.
# E a mesma regua que tirou npx e bunx da lista do harness de origem.
NEGADOS_SEMPRE = {
    "tee", "xargs", "env", "awk", "perl", "ruby", "bash", "sh", "zsh",
    "python", "python3", "node", "npx", "bunx", "eval", "exec", "source",
    ".", "rm", "mv", "cp", "mkdir", "touch", "chmod", "chown",
}


class Negado(Exception):
    pass


def negar(motivo):
    raise Negado(motivo)


def desaspar(token):
    if len(token) >= 2 and token[0] == token[-1] and token[0] in "\"'":
        return token[1:-1]
    return token


def fechar(linha, i):
    """linha[i] == '('; devolve o indice do ')' correspondente."""
    profundidade = 0
    while i < len(linha):
        if linha[i] == "(":
            profundidade += 1
        elif linha[i] == ")":
            profundidade -= 1
            if profundidade == 0:
                return i
        i += 1
    negar("parentese de substituicao de comando nao fechado.")


def varrer(linha):
    """Uma passada de caractere que faz quatro trabalhos ao mesmo tempo:
    rastreia aspas, extrai substituicao de comando, nega substituicao de
    processo e nega redirecionamento para arquivo. Sao quatro porque todos
    dependem do mesmo estado: se o caractere esta ou nao dentro de aspas.

    Devolve (linha com as substituicoes trocadas por SUBST, lista de conteudos).
    """
    partes, saida = [], []
    i, n, aspas = 0, len(linha), None
    while i < n:
        c = linha[i]
        if aspas == "'":
            if c == "'":
                aspas = None
            saida.append(c)
            i += 1
            continue
        if c == "\\" and i + 1 < n:
            saida.append(linha[i:i + 2])
            i += 2
            continue
        if aspas is None and c in ("\"", "'"):
            aspas = c
            saida.append(c)
            i += 1
            continue
        if aspas == "\"" and c == "\"":
            aspas = None
            saida.append(c)
            i += 1
            continue
        if c == "$" and i + 1 < n and linha[i + 1] == "(":
            fim = fechar(linha, i + 1)
            partes.append(linha[i + 2:fim])
            saida.append(SUBST)
            i = fim + 1
            continue
        if c == "`":
            fim = linha.find("`", i + 1)
            if fim < 0:
                negar("crase de substituicao de comando nao fechada.")
            partes.append(linha[i + 1:fim])
            saida.append(SUBST)
            i = fim + 1
            continue
        if aspas is None and c in "<>" and i + 1 < n and linha[i + 1] == "(":
            negar("substituicao de processo vira caminho de arquivo magico, "
                  "e este guarda nao sabe para onde ele aponta.")
        if aspas is None and c == ">":
            fd2 = saida[-1:] == ["2"] and (len(saida) == 1 or saida[-2].isspace())
            m = REDIR_OK.match(linha, i)
            if fd2 and m:
                saida[-1] = " "
                i = m.end()
                continue
            negar("o comando redireciona para arquivo, que e escrita com "
                  "outro nome. So `2>/dev/null` e `2>&1` passam.")
        saida.append(c)
        i += 1
    if aspas is not None:
        negar("aspas nao fechadas: o comando nao pode ser analisado "
              "sintaticamente.")
    return "".join(saida), partes


def tokenizar(linha):
    lex = shlex.shlex(linha, posix=False, punctuation_chars=True)
    lex.whitespace_split = True
    try:
        return list(lex)
    except ValueError as e:
        negar("o comando nao pode ser analisado sintaticamente (%s)." % e)


def partir_em_simples(tokens):
    simples, atual = [], []
    for t in tokens:
        if t in OPERADORES:
            if atual:
                simples.append(atual)
            atual = []
        else:
            atual.append(t)
    if atual:
        simples.append(atual)
    return simples


def destino_fora_do_repo(caminho):
    if not RAIZ:
        return False
    alvo = os.path.realpath(os.path.join(RAIZ, caminho))
    raiz = os.path.realpath(RAIZ)
    return alvo != raiz and not alvo.startswith(raiz + os.sep)


def familia_leitura(nome, args):
    if nome == "sed":
        for a in args:
            if a == "--in-place" or a.startswith("--in-place="):
                negar("`sed --in-place` reescreve o arquivo.")
            if a.startswith("-") and not a.startswith("--") and "i" in a:
                negar("`sed -i` reescreve o arquivo no lugar. `sed -n` passa.")
    if nome == "find":
        for a in args:
            if a in ("-exec", "-execdir", "-ok", "-okdir", "-delete",
                     "-fprint", "-fprintf", "-fls"):
                negar("`find %s` executa comando ou escreve arquivo." % a)
    if nome == "pdftoppm":
        posicionais = [a for a in args if not a.startswith("-")]
        if len(posicionais) < 2:
            negar("`pdftoppm` sem prefixo de destino: nao da para saber "
                  "onde ele escreve.")
        destino = posicionais[-1]
        if destino == SUBST or not destino_fora_do_repo(destino):
            negar("`pdftoppm` so com destino fora do repositorio. O "
                  "CLAUDE.md manda gerar em /tmp.")


def classificar_simples(tokens):
    tokens = [desaspar(t) for t in tokens]
    if not tokens:
        return
    nome = tokens[0]
    args = tokens[1:]
    if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", nome):
        negar("atribuicao de variavel na frente do comando (`%s`) muda o que "
              "ele faz sem mudar o nome dele." % nome)
    if not re.fullmatch(r"[A-Za-z0-9_./+-]+", nome):
        negar("o nome do comando (`%s`) nao e literal, entao nao da para "
              "classifica-lo." % nome)
    base = nome.rsplit("/", 1)[-1]
    if base == "pint":
        negar("`pint` reformata, logo escreve. Rode no seu terminal, de "
              "dentro de backend/ e sempre com argumento.")
    if base in NEGADOS_SEMPRE:
        negar("`%s` executa codigo arbitrario ou escreve arquivo." % base)
    if base == "git":
        return familia_git(args)
    if base == "docker":
        return familia_docker(args)
    if base == "pnpm":
        return familia_pnpm(args)
    if base == "gh":
        return familia_gh(args)
    if base in LEITURA:
        return familia_leitura(base, args)
    negar("`%s` nao esta na lista de comandos liberados quando a branch e "
          "main." % base)


def classificar(linha):
    limpa, partes = varrer(linha)
    for p in partes:
        classificar(p)
    for simples in partir_em_simples(tokenizar(limpa)):
        classificar_simples(simples)


def main():
    if len(sys.argv) < 2:
        return 0
    try:
        classificar(sys.argv[1])
    except Negado as e:
        saida = (
            "Bloqueado pelo harness: %s A branch e `main`, onde so leitura e "
            "um punhado de comandos de verificacao passam. Rode no seu "
            "terminal, ou acrescente a entrada em "
            ".claude/hooks/lib/classificar-comando.py e commite — `.claude/` "
            "e gravavel na main." % e
        )
        sys.stdout.write(saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

> As quatro famílias nomeadas por `classificar_simples` são escritas nas Tasks 3 e 4. Nesta task, coloque estas quatro definições provisórias logo acima de `classificar_simples`, para que o arquivo rode desde já — negar é a política correta enquanto a família não existe:
>
> ```python
> def familia_git(args):
>     negar("a familia `git` ainda nao foi implementada neste guarda.")
>
>
> def familia_docker(args):
>     negar("a familia `docker` ainda nao foi implementada neste guarda.")
>
>
> def familia_pnpm(args):
>     negar("a familia `pnpm` ainda nao foi implementada neste guarda.")
>
>
> def familia_gh(args):
>     negar("a familia `gh` ainda nao foi implementada neste guarda.")
> ```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: `== classificar-comando.tests.sh` com 30 linhas `ok` e nenhuma `FALHA`

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/classificar-comando.py .claude/tests/classificar-comando.tests.sh
git commit -m "feat(harness): varredura e familia de leitura do classificador"
```

---

### Task 3: Classificador — família `git`

**Files:**
- Modify: `.claude/hooks/lib/classificar-comando.py` (substitui o `familia_git` provisório)
- Modify: `.claude/tests/classificar-comando.tests.sh` (acrescenta ao final)

**Interfaces:**
- Consumes: `negar`, `SUBST` da Task 2.
- Produces: `familia_git(nome, args)`.

- [ ] **Step 1: Escrever o teste**

Acrescente ao final de `.claude/tests/classificar-comando.tests.sh`:

```bash
# --- familia git: o par que decide e -C contra -c
assert_libera 'git status --porcelain'
assert_libera 'git -C ../lotus-infra log --oneline -5'
assert_nega   'git -c core.pager=sh log'
assert_nega   'git --config-env=core.pager=X log'
assert_nega   'git --exec-path=/tmp status'

assert_libera 'git log --oneline -10'
assert_libera 'git diff --stat'
assert_libera 'git add docs/superpowers/state.md'
assert_libera 'git commit -m "docs: nota"'
assert_libera 'git branch --list'
assert_libera 'git worktree list --porcelain'
assert_libera 'git push origin HEAD'

assert_nega   'git rebase -i HEAD~3'
assert_nega   'git checkout -b nova'
assert_nega   'git switch outra'
assert_nega   'git restore .'
assert_nega   'git stash pop'
assert_nega   'git log -o saida.txt'
assert_nega   'git branch -D antiga'
assert_nega   'git branch -m velho novo'
assert_nega   'git tag -d v1'
assert_nega   'git push --force origin main'
assert_nega   'git push origin :refs/heads/antiga'
assert_nega   'git push origin +main'
assert_nega   'git worktree remove ../fix-frontend'
assert_nega   'git worktree add --force ../x branch'
assert_nega   'git remote set-url origin https://exemplo.invalido/x.git'
assert_nega   'git pull https://exemplo.invalido/x.git main'
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL nos nove `assert_libera` de `git` — `familia ainda nao implementada`. Os `assert_nega` passam, e é justamente por isso que eles sozinhos não provam nada.

- [ ] **Step 3: Implementar**

Substitua o `familia_git` provisório por:

```python
GIT_SUB = {
    "status", "log", "diff", "show", "rev-parse", "merge-base", "cat-file",
    "ls-files", "blame", "shortlog", "describe", "branch", "worktree",
    "remote", "tag", "add", "commit", "merge", "fetch", "pull", "push",
}
GIT_GLOBAIS_COM_VALOR = {"-C", "--git-dir", "--work-tree", "--namespace"}
GIT_BRANCH_ESCRITA = {"-d", "-D", "-m", "-M", "-c", "-C", "-f",
                      "--delete", "--move", "--copy", "--force"}
URL_REMOTA = re.compile(r"^(https?|git|ssh)://|^[^/\s]+@[^/\s]+:")


def familia_git(args):
    i = 0
    while i < len(args) and args[i].startswith("-"):
        t = args[i]
        # A comparacao e SENSIVEL A CAIXA de proposito: `-C` troca de
        # diretorio e passa; `-c` injeta configuracao, e core.pager executa
        # shell.
        if t == "-c":
            negar("`git -c` injeta configuracao, e `core.pager` executa "
                  "shell. Para trocar de diretorio use `-C` maiusculo.")
        if t.startswith("--config-env"):
            negar("`git --config-env` injeta configuracao pelo ambiente.")
        if t.startswith("--exec-path"):
            negar("`git --exec-path` troca os binarios que o git executa.")
        if t in GIT_GLOBAIS_COM_VALOR:
            i += 2
            continue
        i += 1
    if i >= len(args):
        negar("`git` sem subcomando.")
    sub = args[i]
    resto = args[i + 1:]
    if sub not in GIT_SUB:
        negar("`git %s` nao esta na lista de subcomandos liberados na "
              "main." % sub)
    for a in resto:
        if a == "-o" or a == "--output" or a.startswith("--output="):
            negar("`git %s %s` escreve arquivo." % (sub, a))
    if sub == "branch":
        for a in resto:
            if a in GIT_BRANCH_ESCRITA:
                negar("`git branch %s` altera branch." % a)
    elif sub == "tag":
        for a in resto:
            if a in ("-d", "--delete", "-f", "--force"):
                negar("`git tag %s` altera tag." % a)
    elif sub == "push":
        for a in resto:
            if a.startswith("--force") or a in ("-f", "-d", "--delete",
                                                "--mirror", "--prune"):
                negar("`git push %s` reescreve o remoto." % a)
            if not a.startswith("-") and (a.startswith(":") or a.startswith("+")):
                negar("o refspec `%s` apaga ou forca no remoto." % a)
    elif sub == "worktree":
        if not resto:
            negar("`git worktree` sem subcomando.")
        if resto[0] in ("remove", "move", "prune", "lock", "unlock", "repair"):
            negar("`git worktree %s` mexe na arvore de outra lane." % resto[0])
        if resto[0] == "add" and ("--force" in resto or "-f" in resto):
            negar("`git worktree add --force` sobrescreve arvore existente.")
    elif sub == "remote":
        if resto and resto[0] in ("add", "remove", "rm", "set-url", "rename",
                                  "set-head", "prune"):
            negar("`git remote %s` altera o remoto." % resto[0])
    elif sub in ("pull", "fetch"):
        for a in resto:
            if URL_REMOTA.match(a):
                negar("`git %s` com URL busca de uma origem que nao esta "
                      "configurada." % sub)
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: as 28 asserções novas em `ok`, nenhuma `FALHA`

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/classificar-comando.py .claude/tests/classificar-comando.tests.sh
git commit -m "feat(harness): familia git do classificador"
```

---

### Task 4: Classificador — `docker`, `pnpm`, `gh`

**Files:**
- Modify: `.claude/hooks/lib/classificar-comando.py` (substitui os três `familia_*` provisórios)
- Modify: `.claude/tests/classificar-comando.tests.sh` (acrescenta ao final)

**Interfaces:**
- Consumes: `negar` da Task 2.
- Produces: `familia_docker(args)`, `familia_pnpm(args)`, `familia_gh(args)`.

- [ ] **Step 1: Escrever o teste**

Acrescente ao final de `.claude/tests/classificar-comando.tests.sh`:

```bash
# --- docker
assert_libera 'docker compose up -d'
assert_libera 'docker compose ps'
assert_libera 'docker compose logs -n 50 app'
assert_libera 'docker compose exec -T app php artisan test'
assert_libera 'docker compose exec -T app php artisan test --filter=CotacaoTest'
assert_nega   'docker compose exec -T app sh -c "rm -rf /"'
assert_nega   'docker compose exec -T app bash -c "ls"'
assert_nega   'docker compose exec -T app php artisan migrate'
assert_nega   'docker compose exec -T app php artisan db:seed'
assert_nega   'docker compose exec -T app php artisan typescript:transform'
assert_nega   'docker compose exec -T mysql php artisan test'
assert_nega   'docker compose exec -T app php artisan test --coverage-html=cov'
assert_nega   'docker compose down -v'
assert_nega   'docker run --rm -v /:/host alpine ls'

# --- pnpm
assert_libera 'pnpm test'
assert_libera 'pnpm build'
assert_libera 'pnpm lint'
assert_libera 'pnpm run test'
assert_nega   'pnpm lint -- --fix'
assert_nega   'pnpm dev'
assert_nega   'pnpm add lodash'
assert_nega   'pnpm install'
assert_nega   'pnpm -C ../fix-frontend test'
assert_nega   'pnpm --filter web build'

# --- gh
assert_libera 'gh pr list --state open'
assert_libera 'gh pr view 104'
assert_libera 'gh pr diff 104'
assert_libera 'gh api repos/Andred21/lotus/pulls/104'
assert_nega   'gh api -X POST repos/x/y/issues'
assert_nega   'gh api repos/x/y/issues -f title=oi'
assert_nega   'gh pr merge 104'
assert_nega   'gh pr create --fill'

# --- poppler
assert_libera 'pdfinfo /repo/backend/storage/doc.pdf'
assert_libera 'pdftoppm -png -r 144 -f 1 -l 1 /repo/doc.pdf /tmp/pdf-page'
assert_nega   'pdftoppm -png /repo/doc.pdf /repo/pagina'
assert_nega   'pdftoppm -png /repo/doc.pdf'
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL nos quinze `assert_libera` novos — `familia ainda nao implementada`

- [ ] **Step 3: Implementar**

Substitua os três `familia_*` provisórios por:

```python
DOCKER_COMPOSE_SUB = {"up", "down", "ps", "logs", "config", "version", "exec"}
EXEC_FLAGS_OK = {"-T", "--no-TTY", "-i", "--interactive"}
ARTISAN_FLAGS_ESCRITA = ("--coverage-html", "--log-junit", "--coverage-clover",
                         "--coverage-xml")
PNPM_SCRIPTS = {"test", "build", "lint"}
PNPM_FLAGS_PROIBIDAS = {"-C", "--dir", "--filter", "-w", "--workspace-root"}
GH_LEITURA = {("pr", "view"), ("pr", "list"), ("pr", "diff"), ("pr", "checks"),
              ("run", "view"), ("run", "list"), ("repo", "view")}
GH_API_ESCRITA = {"-X", "--method", "-f", "--field", "-F", "--raw-field"}


def familia_docker(args):
    if not args:
        negar("`docker` sem subcomando.")
    if args[0] != "compose":
        negar("`docker %s` nao esta liberado; so `docker compose`, porque "
              "`docker run` monta volume arbitrario." % args[0])
    sub = args[1] if len(args) > 1 else ""
    if sub not in DOCKER_COMPOSE_SUB:
        negar("`docker compose %s` nao esta liberado na main." % sub)
    resto = args[2:]
    if sub == "down" and ("-v" in resto or "--volumes" in resto):
        negar("`docker compose down -v` apaga o volume do banco de "
              "desenvolvimento.")
    if sub == "exec":
        familia_docker_exec(resto)


def familia_docker_exec(resto):
    i = 0
    while i < len(resto) and resto[i].startswith("-"):
        if resto[i] not in EXEC_FLAGS_OK:
            negar("`docker compose exec %s` nao esta liberado." % resto[i])
        i += 1
    corpo = resto[i + 1:]
    if i >= len(resto) or not corpo:
        negar("`docker compose exec` sem servico ou sem comando.")
    if resto[i] != "app":
        negar("`docker compose exec` so no servico `app`, nao em "
              "`%s`." % resto[i])
    if corpo[0] in ("sh", "bash", "ash", "zsh") or "-c" in corpo:
        negar("`docker compose exec ... sh -c` e execucao arbitraria com "
              "outro nome.")
    if corpo[:2] != ["php", "artisan"]:
        negar("dentro do container, so `php artisan test`.")
    if len(corpo) < 3:
        negar("`php artisan` sem subcomando.")
    if corpo[2] != "test":
        negar("`php artisan %s` escreve; so `test` esta liberado na "
              "main." % corpo[2])
    for a in corpo[3:]:
        if a.startswith(ARTISAN_FLAGS_ESCRITA):
            negar("`%s` escreve arquivo de relatorio." % a)


def familia_pnpm(args):
    if not args:
        negar("`pnpm` sem script.")
    for a in args:
        if a in PNPM_FLAGS_PROIBIDAS or a.startswith("--dir=") \
                or a.startswith("--filter="):
            negar("`pnpm %s` troca qual package.json e lido." % a)
    if "--" in args:
        negar("a cauda depois de `--` e repassada ao script, e "
              "`pnpm lint -- --fix` reescreve frontend/src/.")
    alvo = args[0]
    if alvo == "run":
        if len(args) < 2:
            negar("`pnpm run` sem script.")
        alvo = args[1]
    if alvo not in PNPM_SCRIPTS:
        negar("`pnpm %s` nao esta liberado na main; so test, build e "
              "lint." % alvo)


def familia_gh(args):
    if not args:
        negar("`gh` sem subcomando.")
    if args[0] == "api":
        for a in args[1:]:
            if a in GH_API_ESCRITA or a.startswith("--method=") \
                    or a.startswith("--field="):
                negar("`gh api %s` sai do GET." % a)
        return
    if len(args) < 2 or (args[0], args[1]) not in GH_LEITURA:
        negar("`gh %s` nao esta liberado na main; so leitura." %
              " ".join(args[:2]))
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: as 36 asserções novas em `ok`, nenhuma `FALHA`

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/classificar-comando.py .claude/tests/classificar-comando.tests.sh
git commit -m "feat(harness): familias docker, pnpm e gh do classificador"
```

---

### Task 5: Casca comum e `guard-main`

**Files:**
- Create: `.claude/hooks/lib/comum.sh`
- Create: `.claude/hooks/guard-main.sh`
- Test: `.claude/tests/guard-main.tests.sh`

**Interfaces:**
- Produces (`comum.sh`): `ler_payload` (seta `PAYLOAD`); `campo filtro_jq`; `raiz_de diretorio`; `branch_de diretorio`; `negar_pretooluse motivo`; `bloquear_stop motivo`. Nenhuma política mora aqui.
- Produces: `guard-main.sh`, acionável por `bash guard-main.sh < payload`.

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/guard-main.tests.sh`:

```bash
GUARD="$DIR_HOOKS/guard-main.sh"

decisao() { campo_json "$1" '.hookSpecificOutput.permissionDecision'; }
motivo()  { campo_json "$1" '.hookSpecificOutput.permissionDecisionReason'; }

_a=$(criar_repo); registrar_descarte "$_a"
_b=$(criar_repo); registrar_descarte "$_b"
git -C "$_b" checkout -q -b chore/outra

# --- na main, a allowlist decide
acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/backend/app/Models/X.php" '')"
assert_igual 0 "$CODIGO_HOOK" 'guard-main sai 0 mesmo negando'
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nega escrita em backend/ na main'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/docs/nota.md" '')"
assert_igual '' "$SAIDA_HOOK" 'libera docs/ na main'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/.claude/hooks/novo.sh" '')"
assert_igual '' "$SAIDA_HOOK" 'libera .claude/ na main'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/.agents/skills/x.md" '')"
assert_igual '' "$SAIDA_HOOK" 'libera .agents/ na main'

for _n in CLAUDE.md INSTRUÇÕES-DO-PROJETO.md CONTRIBUINDO.md AGENTS.md README.md; do
  acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/$_n" '')"
  assert_igual '' "$SAIDA_HOOK" "libera $_n na raiz da main"
done

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/docs-antigos/x.md" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'prefixo docs/ nao libera docs-antigos/'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_a/backend/CLAUDE.md" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nome liberado vale so na raiz'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "docs/relativo.md" '')"
assert_igual '' "$SAIDA_HOOK" 'caminho relativo resolve contra o cwd'

# --- fora da main, a allowlist nao se aplica
acionar_hook "$GUARD" "$(payload_escrita "$_b" "$_b/backend/app/Models/X.php" '')"
assert_igual '' "$SAIDA_HOOK" 'libera backend/ quando a branch nao e main'

# --- escrita cruzada: negada seja qual for a branch das duas
acionar_hook "$GUARD" "$(payload_escrita "$_b" "$_a/docs/nota.md" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nega escrita cruzada ainda que em docs/'
assert_contem "$(motivo "$SAIDA_HOOK")" 'outra arvore' 'o motivo da escrita cruzada diz o que e'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_b/frontend/src/x.ts" '')"
assert_igual 'deny' "$(decisao "$SAIDA_HOOK")" 'nega escrita cruzada partindo da main'

# --- falha aberta
_fora=$(mktemp -d); registrar_descarte "$_fora"
acionar_hook "$GUARD" "$(payload_escrita "$_fora" "$_fora/x.txt" '')"
assert_igual '' "$SAIDA_HOOK" 'cwd fora de repositorio: falha aberta'
assert_igual 0 "$CODIGO_HOOK" 'cwd fora de repositorio sai 0'

acionar_hook "$GUARD" "$(payload_escrita "$_a" "$_fora/rascunho.txt" '')"
assert_igual '' "$SAIDA_HOOK" 'alvo fora de qualquer repositorio: falha aberta'

acionar_hook "$GUARD" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao emite decisao'
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL — os `assert_igual 'deny'` obtêm `''`, porque o hook não existe

- [ ] **Step 3: Escrever `lib/comum.sh`**

```bash
# Casca comum dos hooks. Aqui nao mora politica: so leitura de stdin,
# resolucao de raiz e emissao de JSON.

ler_payload() { PAYLOAD=$(cat); }

campo() {
  # $1 = filtro jq. Ecoa vazio quando o payload nao e JSON ou o campo falta.
  [[ -z ${PAYLOAD:-} ]] && return 0
  printf '%s' "$PAYLOAD" | jq -r "$1 // empty" 2>/dev/null
}

raiz_de() {
  # A raiz vem SEMPRE do git, nunca de CLAUDE_PROJECT_DIR: no Lotus as
  # arvores de trabalho sao diretorios IRMAOS (../lotus-infra,
  # ../fix-frontend), entao a variavel aponta para FORA da arvore da sessao,
  # e nao para uma pasta acima dela.
  [[ -d ${1:-} ]] || return 0
  git -C "$1" rev-parse --show-toplevel 2>/dev/null
}

branch_de() {
  [[ -d ${1:-} ]] || return 0
  git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null
}

negar_pretooluse() {
  # Toda emissao passa por `jq -n --arg`: os motivos citam caminhos, e um
  # deles e INSTRUÇÕES-DO-PROJETO.md.
  jq -n --arg motivo "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",
                          permissionDecision:"deny",
                          permissionDecisionReason:$motivo}}'
}

bloquear_stop() {
  # O evento Stop usa decision/reason na RAIZ do JSON — formato diferente do
  # hookSpecificOutput do PreToolUse.
  jq -n --arg motivo "$1" '{decision:"block", reason:$motivo}'
}
```

- [ ] **Step 4: Escrever `guard-main.sh`**

```bash
#!/usr/bin/env bash
# Nega escrita cruzada entre arvores, e escrita na main fora da allowlist.
# Contrato: exit 0 sempre, JSON no stdout. Falha aberta.
# Sem `set -e`: o corpo e chamado com `|| true` e o arquivo termina em exit 0.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

PREFIXOS_LIBERADOS=(docs/ .claude/ .agents/)
NOMES_LIBERADOS=(CLAUDE.md INSTRUÇÕES-DO-PROJETO.md CONTRIBUINDO.md AGENTS.md README.md)
# A lista de prefixos PROIBIDOS do harness de origem (.worktrees/,
# .claude/worktrees/) nao e portada: nenhuma arvore do Lotus mora dentro do
# repositorio, e a regra de escrita cruzada ja cobre o caso.

liberado_na_main() {
  local rel=$1 p n
  for p in "${PREFIXOS_LIBERADOS[@]}"; do
    [[ $rel == "$p"* ]] && return 0
  done
  for n in "${NOMES_LIBERADOS[@]}"; do
    [[ $rel == "$n" ]] && return 0
  done
  return 1
}

ancestral_existente() {
  # O alvo em geral AINDA NAO EXISTE — e o caso do Write —, entao sobe pelos
  # diretorios ate achar um que exista, e pergunta a branch ali.
  local d=$1
  while [[ -n $d && $d != / && ! -d $d ]]; do d=$(dirname "$d"); done
  printf '%s' "$d"
}

corpo() {
  ler_payload
  local alvo cwd raiz_sessao dir_alvo raiz_alvo branch rel
  alvo=$(campo '.tool_input.file_path')
  cwd=$(campo '.cwd')
  [[ -z $alvo ]] && return 0

  raiz_sessao=$(raiz_de "$cwd")
  [[ -z $raiz_sessao ]] && return 0

  [[ $alvo != /* ]] && alvo="$cwd/$alvo"
  alvo=$(realpath -m "$alvo")
  dir_alvo=$(ancestral_existente "$(dirname "$alvo")")
  raiz_alvo=$(raiz_de "$dir_alvo")
  [[ -z $raiz_alvo ]] && return 0

  if [[ $raiz_alvo != "$raiz_sessao" ]]; then
    negar_pretooluse "Bloqueado pelo harness: o alvo esta em outra arvore de \
trabalho ($raiz_alvo), e esta sessao trabalha em $raiz_sessao. Cada lane \
escreve so na propria arvore. Nenhum caminho isenta desta regra."
    return 0
  fi

  branch=$(branch_de "$dir_alvo")
  [[ $branch != main ]] && return 0

  rel=${alvo#"$raiz_alvo"/}
  liberado_na_main "$rel" && return 0
  negar_pretooluse "Bloqueado pelo harness: a branch desta arvore e \`main\`, \
onde so se escreve em docs/, .claude/, .agents/ e nos cinco arquivos de raiz \
(CLAUDE.md, INSTRUÇÕES-DO-PROJETO.md, CONTRIBUINDO.md, AGENTS.md, README.md). \
O alvo e \`$rel\`. Abra a worktree do bloco e escreva la."
}

corpo || true
exit 0
```

- [ ] **Step 5: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: as 22 asserções de `guard-main.tests.sh` em `ok`, nenhuma `FALHA`

- [ ] **Step 6: Commit**

```bash
git add .claude/hooks/lib/comum.sh .claude/hooks/guard-main.sh .claude/tests/guard-main.tests.sh
git commit -m "feat(harness): guard-main e a casca comum dos hooks"
```

---

### Task 6: `guard-main-shell`

**Files:**
- Create: `.claude/hooks/guard-main-shell.sh`
- Test: `.claude/tests/guard-main-shell.tests.sh`

**Interfaces:**
- Consumes: `comum.sh` (Task 5) e `lib/classificar-comando.py` (Tasks 2–4).

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/guard-main-shell.tests.sh`:

```bash
GUARDSH="$DIR_HOOKS/guard-main-shell.sh"

decisao_sh() { campo_json "$1" '.hookSpecificOutput.permissionDecision'; }
motivo_sh()  { campo_json "$1" '.hookSpecificOutput.permissionDecisionReason'; }

_m=$(criar_repo); registrar_descarte "$_m"
_o=$(criar_repo); registrar_descarte "$_o"
git -C "$_o" checkout -q -b chore/bloco

# --- na main, o classificador decide
acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'ls -la docs')"
assert_igual '' "$SAIDA_HOOK" 'libera leitura na main'
assert_igual 0 "$CODIGO_HOOK" 'sai 0 ao liberar'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'rm -rf backend')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'nega rm na main'
assert_igual 0 "$CODIGO_HOOK" 'sai 0 ao negar — nunca exit 2'
assert_contem "$(motivo_sh "$SAIDA_HOOK")" 'classificar-comando.py' 'o motivo aponta a saida'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'pnpm lint -- --fix')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'nega a cauda depois de -- na main'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" 'pnpm lint')"
assert_igual '' "$SAIDA_HOOK" 'libera pnpm lint na main'

# --- fora da main, o classificador nem e chamado
acionar_hook "$GUARDSH" "$(payload_bash "$_o" 'rm -rf backend')"
assert_igual '' "$SAIDA_HOOK" 'nao guarda branch que nao e main'

# --- falha aberta por infraestrutura
_fora2=$(mktemp -d); registrar_descarte "$_fora2"
acionar_hook "$GUARDSH" "$(payload_bash "$_fora2" 'rm -rf /')"
assert_igual '' "$SAIDA_HOOK" 'sem raiz git: falha aberta'

acionar_hook "$GUARDSH" "$(payload_bash "$_m" '')"
assert_igual '' "$SAIDA_HOOK" 'comando vazio nao decide nada'

# --- falha FECHADA por classificacao: o classificador some, o guarda nega
_quebrado=$(criar_repo); registrar_descarte "$_quebrado"
mkdir -p "$_quebrado/.claude/hooks/lib"
cp "$GUARDSH" "$_quebrado/.claude/hooks/"
cp "$DIR_HOOKS/lib/comum.sh" "$_quebrado/.claude/hooks/lib/"
acionar_hook "$_quebrado/.claude/hooks/guard-main-shell.sh" "$(payload_bash "$_quebrado" 'ls')"
assert_igual 'deny' "$(decisao_sh "$SAIDA_HOOK")" 'classificador ausente: falha fechada'
assert_igual 0 "$CODIGO_HOOK" 'falha fechada tambem sai 0'
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL nos três `assert_igual 'deny'` — o hook não existe

- [ ] **Step 3: Implementar**

Crie `.claude/hooks/guard-main-shell.sh`:

```bash
#!/usr/bin/env bash
# Restringe o shell quando a branch da arvore e `main`.
# Duas politicas opostas, de proposito:
#   - falha ABERTA por infraestrutura: nao deu para saber se e a main, entao
#     nao ha o que guardar;
#   - falha FECHADA por classificacao: o comando existe e nao deu para
#     entende-lo, que e exatamente a hipotese que a allowlist trata.
# Contrato: exit 0 sempre, JSON no stdout.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

corpo() {
  ler_payload
  local cmd cwd raiz branch motivo codigo
  cmd=$(campo '.tool_input.command')
  cwd=$(campo '.cwd')
  [[ -z $cmd ]] && return 0

  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  branch=$(branch_de "$raiz")
  [[ $branch != main ]] && return 0

  motivo=$(LOTUS_RAIZ="$raiz" python3 "$DIR/lib/classificar-comando.py" "$cmd" 2>/dev/null)
  codigo=$?
  if (( codigo != 0 )); then
    negar_pretooluse "Bloqueado pelo harness: o classificador de comando \
falhou (codigo $codigo, arquivo $DIR/lib/classificar-comando.py). Na \`main\`, \
comando que nao da para classificar e negado. Rode no seu terminal."
    return 0
  fi
  [[ -n $motivo ]] && negar_pretooluse "$motivo"
  return 0
}

corpo || true
exit 0
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: as 12 asserções de `guard-main-shell.tests.sh` em `ok`, nenhuma `FALHA`

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/guard-main-shell.sh .claude/tests/guard-main-shell.tests.sh
git commit -m "feat(harness): guard-main-shell, a casca do classificador"
```

---

### Task 7: `guard-secrets`

**Files:**
- Create: `.claude/hooks/guard-secrets.sh`
- Test: `.claude/tests/guard-secrets.tests.sh`

**Interfaces:**
- Consumes: `comum.sh` (Task 5).

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/guard-secrets.tests.sh`:

```bash
SEGREDOS="$DIR_HOOKS/guard-secrets.sh"

decisao_seg() { campo_json "$1" '.hookSpecificOutput.permissionDecision'; }

# Valores com o tamanho provado pela propria construcao, para nao depender de
# eu contar caracteres certo.
_appkey="APP_KEY=base64:$(printf 'A%.0s' {1..43})="
_akid="AKIA$(printf 'Q%.0s' {1..16})"
_awssec="AWS_SECRET_ACCESS_KEY=$(printf 'z%.0s' {1..40})"
_ghtoken="ghp_$(printf 'a%.0s' {1..36})"

_s=$(criar_repo); registrar_descarte "$_s"
mkdir -p "$_s/.claude/tests" "$_s/docker"

# --- peneira de nome
for _neg in .env .env.local backend/.env.production frontend/.env; do
  acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/$_neg" '')"
  assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" "nega pelo nome: $_neg"
done

for _lib in .env.example backend/.env.example backend/.env.production.example frontend/.env.example docker/probe.env; do
  acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/$_lib" 'APP_ENV=local')"
  assert_igual '' "$SAIDA_HOOK" "libera pelo nome: $_lib"
done

# --- peneira de conteudo
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_appkey")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega APP_KEY com valor'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_akid")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega access key id da AWS'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_awssec")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega chave secreta da AWS'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docs/nota.md" "$_ghtoken")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" 'nega token do GitHub'

# --- o que NAO pode ser negado: as senhas de desenvolvimento do compose
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docker-compose.yml" 'MYSQL_ROOT_PASSWORD: secret')"
assert_igual '' "$SAIDA_HOOK" 'libera MYSQL_ROOT_PASSWORD do compose'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/docker-compose.yml" 'MINIO_ROOT_PASSWORD: lotus-secret')"
assert_igual '' "$SAIDA_HOOK" 'libera MINIO_ROOT_PASSWORD do compose'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/backend/.env.example" 'APP_KEY=')"
assert_igual '' "$SAIDA_HOOK" 'libera APP_KEY sem valor no .env.example'

# --- nome liberado NAO e conteudo liberado
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.env.example" "$_appkey")"
assert_igual 'deny' "$(decisao_seg "$SAIDA_HOOK")" '.env.example com APP_KEY real e negado'

# --- isencoes de conteudo
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.claude/hooks/guard-secrets.sh" "$_akid")"
assert_igual '' "$SAIDA_HOOK" 'isenta .claude/hooks/ — e o fonte do proprio guarda'

acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.claude/tests/guard-secrets.tests.sh" "$_akid")"
assert_igual '' "$SAIDA_HOOK" 'isenta .claude/tests/ — as marcas sao a carga dos testes'

_forasec=$(mktemp -d); registrar_descarte "$_forasec"
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_forasec/rascunho.txt" "$_akid")"
assert_igual '' "$SAIDA_HOOK" 'isenta alvo fora do repositorio'

# --- contrato
acionar_hook "$SEGREDOS" "$(payload_escrita "$_s" "$_s/.env" '')"
assert_igual 0 "$CODIGO_HOOK" 'guard-secrets sai 0 ao negar'
acionar_hook "$SEGREDOS" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao emite decisao'
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL nos nove `assert_igual 'deny'` — o hook não existe

- [ ] **Step 3: Implementar**

Crie `.claude/hooks/guard-secrets.sh`:

```bash
#!/usr/bin/env bash
# Nega gravacao de arquivo de ambiente e de conteudo com marca de credencial
# de servidor. Contrato: exit 0 sempre, JSON no stdout. Falha aberta.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

# So formas inconfundiveis. Nenhuma regra generica de PASSWORD=: o
# docker-compose.yml versionado tem MYSQL_ROOT_PASSWORD e
# MINIO_ROOT_PASSWORD de desenvolvimento, e uma regra generica impediria
# editar o compose, que e trabalho normal. A senha do RDS nao tem forma
# distinguivel — quem a cobre e a peneira de NOME, porque ela so vive em
# backend/.env.production.
MARCAS=(
  'APP_KEY[[:space:]]*=[[:space:]]*base64:[A-Za-z0-9+/]{43}='
  'AKIA[0-9A-Z]{16}'
  "(AWS|MINIO|S3)[A-Z_]*(SECRET|PASSWORD)[A-Z_]*[[:space:]]*[:=][[:space:]]*[\"']?[A-Za-z0-9/+=]{24,}"
  'gh[pousr]_[A-Za-z0-9]{36}'
)
DESCRICOES=(
  'a chave de aplicacao do Laravel (APP_KEY) com valor'
  'um access key id da AWS'
  'uma chave secreta de AWS, MinIO ou S3 com valor'
  'um token do GitHub'
)

dentro_de() { [[ $1 == "$2" || $1 == "$2"/* ]]; }

corpo() {
  ler_payload
  local alvo cwd nome raiz conteudo i
  alvo=$(campo '.tool_input.file_path')
  cwd=$(campo '.cwd')
  [[ -z $alvo ]] && return 0
  [[ $alvo != /* ]] && alvo="$cwd/$alvo"
  alvo=$(realpath -m "$alvo")
  nome=$(basename "$alvo")

  # Peneira de nome. A excecao e por SUFIXO, nao por nome exato: o harness de
  # origem isentava literalmente '.env.example', e o Lotus versiona
  # .env.example, backend/.env.example, backend/.env.production.example e
  # frontend/.env.example — a regra nominal negaria tres dos quatro.
  # 'docker/probe.env' nao casa o padrao (termina em .env, nao comeca), e
  # isso esta certo: e fixture versionada, e o conteudo dela continua
  # inspecionado abaixo.
  if [[ ( $nome == .env || $nome == .env.* ) && $nome != *.example ]]; then
    negar_pretooluse "Bloqueado pelo harness: \`$nome\` guarda segredo e e \
gitignored. Edite o arquivo a mao, fora do agente."
    return 0
  fi

  # Isencoes da peneira de conteudo.
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  dentro_de "$alvo" "$raiz" || return 0
  dentro_de "$alvo" "$raiz/.claude/hooks" && return 0
  dentro_de "$alvo" "$raiz/.claude/tests" && return 0

  conteudo="$(campo '.tool_input.content')$(campo '.tool_input.new_string')"
  [[ -z $conteudo ]] && return 0

  for i in "${!MARCAS[@]}"; do
    if printf '%s' "$conteudo" | grep -Eq "${MARCAS[$i]}"; then
      negar_pretooluse "Bloqueado pelo harness: o conteudo contem \
${DESCRICOES[$i]}, que e marca de credencial de servidor. Segredo de \
producao vive no .env da maquina e no Secrets Manager, nunca no \
repositorio."
      return 0
    fi
  done
  return 0
}

corpo || true
exit 0
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: as 23 asserções de `guard-secrets.tests.sh` em `ok`, nenhuma `FALHA`

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/guard-secrets.sh .claude/tests/guard-secrets.tests.sh
git commit -m "feat(harness): guard-secrets com a excecao por sufixo .example"
```

---

### Task 8: `session-start` e o leitor de estado

**Files:**
- Create: `.claude/hooks/lib/ler-estado.py`
- Create: `.claude/hooks/session-start.sh`
- Test: `.claude/tests/session-start.tests.sh`

**Interfaces:**
- Produces (`ler-estado.py`): `argv[1]` é o caminho de um `state.md`. Emite uma linha por lane, campos separados por TAB, na ordem `lane`, `id`, `workflow_state`, `active_work_item`, `branch`, `tree`, `next_action`. Arquivo ausente ou YAML inválido emitem nada, com `exit 0`.
- Consumes: `comum.sh` (Task 5).

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/session-start.tests.sh`:

```bash
INICIO="$DIR_HOOKS/session-start.sh"

escrever_estado() {
  # $1 = raiz, $2 = workflow_state da lane-c, $3 = tree da lane-c
  mkdir -p "$1/docs/superpowers"
  cat > "$1/docs/superpowers/state.md" <<ESTADO
---
schema_version: 2
mode: multi-lane
lanes:
  lane-a:
    active_work_item: harness-hooks-de-guarda
    workflow_state: planning
    next_action: continue_active_planning
    tree: .
    branch: main
  lane-c:
    active_work_item: frontend-revisao-ui
    workflow_state: $2
    next_action: continue_active_plan
    tree: $3
    branch: refactor/frontend
---

# Estado
ESTADO
}

_p=$(criar_repo); registrar_descarte "$_p"
_c="${_p}-lane-c"
git -C "$_p" worktree add -q -b refactor/frontend "$_c" >/dev/null 2>&1
registrar_descarte "$_c"

escrever_estado "$_p" idle "../$(basename "$_c")"
escrever_estado "$_c" idle "../$(basename "$_c")"

acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_igual 0 "$CODIGO_HOOK" 'session-start sai 0'
assert_contem "$SAIDA_HOOK" 'lane-a' 'relata a lane-a'
assert_contem "$SAIDA_HOOK" 'lane-c' 'relata a lane-c'
assert_contem "$SAIDA_HOOK" 'refactor/frontend' 'relata a branch da outra lane'
assert_contem "$SAIDA_HOOK" '* lane-a' 'marca com * a lane desta sessao'
assert_nao_contem "$SAIDA_HOOK" 'ESTADO VENCIDO' 'sem divergencia, sem alarme'
assert_nao_contem "$SAIDA_HOOK" 'permissionDecision' 'SessionStart emite texto puro, nao JSON'

# --- o alarme que teria evitado o erro deste bloco
escrever_estado "$_c" executing "../$(basename "$_c")"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'ESTADO VENCIDO' 'acusa divergencia entre a main e a arvore da lane'
assert_contem "$SAIDA_HOOK" 'lane-c' 'a divergencia nomeia a lane'

# --- fechamento interrompido
escrever_estado "$_p" ready_for_closure '../arvore-que-nao-existe'
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'FECHAMENTO INTERROMPIDO' 'acusa lane em ready_for_closure sem arvore'

# --- arvore orfa
_orfa="${_p}-orfa"
git -C "$_p" worktree add -q -b chore/orfa "$_orfa" >/dev/null 2>&1
registrar_descarte "$_orfa"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_p" '{session_id:"teste", cwd:$cwd, source:"startup"}')"
assert_contem "$SAIDA_HOOK" 'ARVORE ORFA' 'acusa arvore no disco que nenhuma lane reclama'
assert_contem "$SAIDA_HOOK" 'chore/orfa' 'a arvore orfa e nomeada pela branch'

# --- falha aberta
_forasess=$(mktemp -d); registrar_descarte "$_forasess"
acionar_hook "$INICIO" "$(jq -nc --arg cwd "$_forasess" '{session_id:"teste", cwd:$cwd}')"
assert_igual '' "$SAIDA_HOOK" 'cwd fora de repositorio: nao relata nada'
acionar_hook "$INICIO" ''
assert_igual 0 "$CODIGO_HOOK" 'payload vazio sai 0'
assert_igual '' "$SAIDA_HOOK" 'payload vazio nao relata nada'
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em todos os `assert_contem` — o hook não existe e `SAIDA_HOOK` vem vazio

- [ ] **Step 3: Escrever `lib/ler-estado.py`**

```python
#!/usr/bin/env python3
"""Le o frontmatter de um state.md e emite uma linha por lane, com TAB.

Contrato:
  argv[1]  caminho do state.md
  stdout   lane<TAB>id<TAB>workflow_state<TAB>active_work_item<TAB>branch
           <TAB>tree<TAB>next_action
  exit 0   sempre. Arquivo ausente, frontmatter ausente ou YAML invalido
           emitem nada: quem chama nao distingue os casos, e nao precisa.
"""

import sys

import yaml

CAMPOS = ("workflow_state", "active_work_item", "branch", "tree",
          "next_action")


def main():
    if len(sys.argv) < 2:
        return 0
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            texto = f.read()
    except OSError:
        return 0
    if not texto.startswith("---"):
        return 0
    partes = texto.split("---", 2)
    if len(partes) < 3:
        return 0
    try:
        dados = yaml.safe_load(partes[1])
    except yaml.YAMLError:
        return 0
    if not isinstance(dados, dict):
        return 0
    lanes = dados.get("lanes")
    if not isinstance(lanes, dict):
        return 0
    for ident in sorted(lanes):
        lane = lanes[ident]
        if not isinstance(lane, dict):
            continue
        valores = [str(lane.get(c) if lane.get(c) is not None else "")
                   for c in CAMPOS]
        sys.stdout.write("lane\t%s\t%s\n" % (ident, "\t".join(valores)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Escrever `session-start.sh`**

```bash
#!/usr/bin/env bash
# Injeta o estado real das lanes no inicio da sessao.
# Nao e porte: o harness de origem lia um lane.ps1 que ficou fora de escopo.
# A fonte aqui e o disco — `git worktree list` mais o state.md de cada arvore.
# Contrato: SessionStart NUNCA bloqueia. Texto puro no stdout, exit 0.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

LER_ESTADO="$DIR/lib/ler-estado.py"

corpo() {
  ler_payload
  local cwd raiz branch_atual head sujos
  cwd=$(campo '.cwd')
  [[ -z $cwd ]] && return 0
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0
  branch_atual=$(branch_de "$raiz")
  head=$(git -C "$raiz" rev-parse --short HEAD 2>/dev/null)
  sujos=$(git -C "$raiz" status --porcelain 2>/dev/null | wc -l)

  # --- inventario das arvores
  local -a arv_caminho=() arv_branch=()
  local linha cam='' br=''
  while IFS= read -r linha; do
    case $linha in
      'worktree '*) cam=${linha#worktree }; br='(sem branch)' ;;
      'branch refs/heads/'*) br=${linha#branch refs/heads/} ;;
      'detached') br='(detached)' ;;
      '') [[ -n $cam ]] && { arv_caminho+=("$cam"); arv_branch+=("$br"); cam=''; } ;;
    esac
  done < <(git -C "$raiz" worktree list --porcelain 2>/dev/null; printf '\n')

  # A arvore da main e a referencia: o state.md dela e o que descreve todas
  # as lanes.
  local principal='' i
  for i in "${!arv_caminho[@]}"; do
    [[ ${arv_branch[$i]} == main ]] && principal=${arv_caminho[$i]}
  done
  [[ -z $principal ]] && principal=$raiz
  local estado_principal="$principal/docs/superpowers/state.md"
  [[ -f $estado_principal ]] || return 0

  local -a linhas=() vencidas=() interrompidas=() reclamadas=()
  linhas+=('Harness de blocos. Lanes:')
  linhas+=('')

  local id ws item br_lane tree na marca outro estado_outro ws2 item2
  while IFS=$'\t' read -r _ id ws item br_lane tree na; do
    reclamadas+=("$br_lane")
    marca='  '
    [[ -n $br_lane && $br_lane == "$branch_atual" ]] && marca='* '
    linhas+=("${marca}${id} [${ws:-sem-estado}] ${item:-sem-item} em ${tree:-sem-arvore} (${br_lane:-sem-branch}) -> ${na:-sem-proxima-acao}")

    outro=$tree
    [[ $outro != /* ]] && outro="$principal/$tree"
    estado_outro="$outro/docs/superpowers/state.md"
    if [[ -d $outro ]]; then
      if [[ $(realpath -m "$outro") != "$(realpath -m "$principal")" && -f $estado_outro ]]; then
        # Compara o que a main diz da lane com o que a arvore da lane diz de
        # si mesma. Foi esta divergencia — a main dizendo lane-c idle enquanto
        # a arvore dizia executing — que custou duas paradas no planejamento
        # deste bloco.
        IFS=$'\t' read -r _ _ ws2 item2 _ < <(python3 "$LER_ESTADO" "$estado_outro" | awk -F'\t' -v k="$id" '$2==k')
        if [[ -n $ws2 && ( $ws2 != "$ws" || $item2 != "$item" ) ]]; then
          vencidas+=("$id: a main diz [$ws / ${item:-sem-item}], a arvore $tree diz [$ws2 / ${item2:-sem-item}]")
        fi
      fi
    elif [[ $ws == ready_for_closure ]]; then
      interrompidas+=("$id em ready_for_closure, e a arvore $tree nao existe no disco")
    fi
  done < <(python3 "$LER_ESTADO" "$estado_principal")

  # Arvore no disco que nenhuma lane reclama.
  local orfas=() j reclamada
  for i in "${!arv_caminho[@]}"; do
    reclamada=0
    for j in "${reclamadas[@]}"; do
      [[ $j == "${arv_branch[$i]}" ]] && reclamada=1
    done
    (( reclamada == 0 )) && [[ ${arv_branch[$i]} != main ]] \
      && orfas+=("${arv_caminho[$i]} em ${arv_branch[$i]}")
  done

  linhas+=('')
  linhas+=("Git agora: branch=$branch_atual HEAD=$head arquivos-modificados=$sujos")
  linhas+=('A lane marcada com * e a desta sessao. As demais pertencem a outras sessoes: nao mexa nelas.')
  linhas+=('HEAD a frente do campo commit e NORMAL: o estado so e reescrito em fronteira duravel.')
  linhas+=('Divergencia entre o estado, o plano, a spec e o git bloqueia a sessao: pare e relate.')

  if (( ${#vencidas[@]} > 0 )); then
    linhas+=('')
    linhas+=('ESTADO VENCIDO — a main e a arvore da lane discordam:')
    for i in "${!vencidas[@]}"; do linhas+=("  ${vencidas[$i]}"); done
    linhas+=('Quem manda e o state.md da arvore que esta executando. Nao promova nada ate reconciliar.')
  fi
  if (( ${#interrompidas[@]} > 0 )); then
    linhas+=('')
    linhas+=('FECHAMENTO INTERROMPIDO:')
    for i in "${!interrompidas[@]}"; do linhas+=("  ${interrompidas[$i]}"); done
    linhas+=('O merge pode ter acontecido e o fechamento nao. Nao apague a branch antes de conferir.')
  fi
  if (( ${#orfas[@]} > 0 )); then
    linhas+=('')
    linhas+=('ARVORE ORFA — no disco, sem lane que a reclame:')
    for i in "${!orfas[@]}"; do linhas+=("  ${orfas[$i]}"); done
  fi

  printf '%s\n' "${linhas[@]}"
  return 0
}

corpo || true
exit 0
```

- [ ] **Step 5: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: as 15 asserções de `session-start.tests.sh` em `ok`, nenhuma `FALHA`

- [ ] **Step 6: Commit**

```bash
git add .claude/hooks/lib/ler-estado.py .claude/hooks/session-start.sh .claude/tests/session-start.tests.sh
git commit -m "feat(harness): session-start le o estado real das arvores"
```

---

### Task 9: `stop-verify`

**Files:**
- Create: `.claude/hooks/stop-verify.sh`
- Test: `.claude/tests/stop-verify.tests.sh`

**Interfaces:**
- Consumes: `comum.sh` (Task 5), em especial `bloquear_stop`.

- [ ] **Step 1: Escrever o teste**

Crie `.claude/tests/stop-verify.tests.sh`:

```bash
PARADA="$DIR_HOOKS/stop-verify.sh"

payload_stop() {
  # $1 = cwd, $2 = session_id, $3 = stop_hook_active ("true"/"false")
  jq -nc --arg cwd "$1" --arg sid "$2" --argjson ativo "$3" \
    '{session_id:$sid, cwd:$cwd, stop_hook_active:$ativo, hook_event_name:"Stop"}'
}
limpar_marcas() { rm -f "${TMPDIR:-/tmp}"/lotus-stopverify-teste-*.marca; }

_v=$(criar_repo); registrar_descarte "$_v"
limpar_marcas

# --- arvore limpa nao cobra nada
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-limpo false)"
assert_igual '' "$SAIDA_HOOK" 'arvore limpa nao bloqueia'
assert_igual 0 "$CODIGO_HOOK" 'sai 0 com arvore limpa'

# --- backend
printf 'x\n' > "$_v/backend/Modelo.php"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-back false)"
assert_igual 'block' "$(campo_json "$SAIDA_HOOK" '.decision')" 'bloqueia com backend/ sujo'
assert_igual '' "$(campo_json "$SAIDA_HOOK" '.hookSpecificOutput')" 'Stop usa decision/reason na RAIZ, nao hookSpecificOutput'
_r=$(campo_json "$SAIDA_HOOK" '.reason')
assert_contem "$_r" 'php artisan test' 'cobra a suite do backend'
assert_contem "$_r" 'pint' 'cobra o pint'
assert_nao_contem "$_r" 'pnpm build' 'nao cobra o frontend quando o frontend nao mudou'

# --- o aviso nao repete para o mesmo commit
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-back false)"
assert_igual '' "$SAIDA_HOOK" 'a marca impede repetir o aviso para o mesmo commit'

# --- guarda primaria contra laco
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-laco true)"
assert_igual '' "$SAIDA_HOOK" 'stop_hook_active corta o laco imediato'

# --- frontend
rm -f "$_v/backend/Modelo.php"
printf 'x\n' > "$_v/frontend/tela.ts"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-front false)"
_r=$(campo_json "$SAIDA_HOOK" '.reason')
assert_contem "$_r" 'pnpm build' 'cobra o build do frontend'
assert_contem "$_r" 'pnpm test' 'cobra os testes do frontend'
assert_nao_contem "$_r" 'artisan' 'nao cobra o backend quando o backend nao mudou'

# --- .claude
rm -f "$_v/frontend/tela.ts"
printf 'x\n' > "$_v/.claude/hooks/novo.sh"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-claude false)"
_r=$(campo_json "$SAIDA_HOOK" '.reason')
assert_contem "$_r" 'run-all.sh' 'cobra a suite do harness'

# --- caminho fora dos tres vigiados nao cobra nada
rm -f "$_v/.claude/hooks/novo.sh"
printf 'x\n' > "$_v/docs/nota.md"
acionar_hook "$PARADA" "$(payload_stop "$_v" teste-docs false)"
assert_igual '' "$SAIDA_HOOK" 'docs/ nao esta entre os caminhos vigiados'

limpar_marcas
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bash .claude/tests/run-all.sh`
Expected: FAIL em `bloqueia com backend/ sujo` e nos `assert_contem` da razão — o hook não existe

- [ ] **Step 3: Implementar**

Crie `.claude/hooks/stop-verify.sh`:

```bash
#!/usr/bin/env bash
# Cobra evidencia de verificacao quando a sessao mexeu em codigo.
# Duas guardas contra laco, com papeis diferentes: stop_hook_active (campo da
# API, vem true quando o Claude Code ja esta continuando por causa de um
# bloqueio anterior deste mesmo hook) corta o laco imediato; a marca em TMPDIR
# implementa o "este aviso nao repete para o mesmo commit" que o proprio texto
# promete ao leitor.
# Contrato: decision/reason na RAIZ do JSON. exit 0 sempre. Falha aberta.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/lib/comum.sh"

contar() { git -C "$1" status --porcelain -- "$2" 2>/dev/null | wc -l; }

corpo() {
  ler_payload
  local cwd raiz sid head marca n_back n_front n_claude motivo lista
  local -a exigencias=()

  [[ $(campo '.stop_hook_active') == true ]] && return 0
  cwd=$(campo '.cwd')
  [[ -z $cwd ]] && return 0
  raiz=$(raiz_de "$cwd")
  [[ -z $raiz ]] && return 0

  # O filtro de caminho e do git, nunca um regex sobre a saida: o formato
  # porcelain poe o caminho ANTIGO primeiro numa renomeacao
  # ('R  a.ts -> src/b.ts') e envolve em aspas duplas qualquer caminho com
  # espaco. Regex ancorado depois do status erra os dois casos.
  n_back=$(contar "$raiz" backend)
  n_front=$(contar "$raiz" frontend)
  n_claude=$(contar "$raiz" .claude)
  (( n_back + n_front + n_claude == 0 )) && return 0

  sid=$(campo '.session_id'); [[ -z $sid ]] && sid=sem-sessao
  head=$(git -C "$raiz" rev-parse --short HEAD 2>/dev/null); [[ -z $head ]] && head=sem-head
  marca="${TMPDIR:-/tmp}/lotus-stopverify-${sid}-${head}.marca"
  [[ -e $marca ]] && return 0
  : > "$marca" 2>/dev/null

  # Cobra so o que foi tocado. Pedir 'pnpm build' quando so o backend mudou
  # treina o leitor a ignorar o aviso.
  (( n_back > 0 )) && exigencias+=("backend/ ($n_back arquivo(s)): 'docker compose exec -T app php artisan test' e 'cd backend && ./vendor/bin/pint <arquivos>' — o pint NUNCA sem argumento, que reformata o repo inteiro")
  (( n_front > 0 )) && exigencias+=("frontend/ ($n_front arquivo(s)): 'pnpm build', 'pnpm test' e 'pnpm lint'")
  (( n_claude > 0 )) && exigencias+=(".claude/ ($n_claude arquivo(s)): 'bash .claude/tests/run-all.sh'")

  lista=$(printf '%s | ' "${exigencias[@]}")
  lista=${lista% | }

  motivo="NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE. Este hook \
le a arvore inteira e nao sabe quais arquivos sao seus. Antes de encerrar, \
rode nesta sessao e cole a saida de: ${lista}. Se ja rodou e o resultado esta \
limpo, diga isso com a saida e encerre. Este aviso nao repete para o mesmo \
commit."

  bloquear_stop "$motivo"
  return 0
}

corpo || true
exit 0
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bash .claude/tests/run-all.sh`
Expected: as 14 asserções de `stop-verify.tests.sh` em `ok`, nenhuma `FALHA`

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/stop-verify.sh .claude/tests/stop-verify.tests.sh
git commit -m "feat(harness): stop-verify cobra so o que foi tocado"
```

---

### Task 10: Registrar os hooks e provar no repositório real

**Files:**
- Create: `.claude/settings.json`
- Modify: bit de execução dos sete scripts de `.claude/hooks/` e `.claude/tests/run-all.sh`

**Interfaces:**
- Consumes: os cinco hooks das Tasks 5–9.

- [ ] **Step 1: Escrever `settings.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact|fork",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/session-start.sh\"",
            "timeout": 15,
            "statusMessage": "Lendo o estado das lanes..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-main.sh\"",
            "timeout": 15,
            "statusMessage": "Verificando branch e arvore..."
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-secrets.sh\"",
            "timeout": 15,
            "statusMessage": "Verificando segredos..."
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-main-shell.sh\"",
            "timeout": 15,
            "statusMessage": "Verificando comando na main..."
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.claude/hooks/stop-verify.sh\"",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

> `${CLAUDE_PROJECT_DIR}` aqui **localiza o arquivo do script**, e é a única expansão que o Claude Code oferece na string do comando. Ele não decide política nenhuma: a raiz que decide vem do `git rev-parse` dentro de cada hook.

- [ ] **Step 2: Marcar os scripts como executáveis**

```bash
chmod +x .claude/hooks/*.sh .claude/hooks/lib/*.py .claude/tests/run-all.sh
```

- [ ] **Step 3: Conferir que o JSON é válido**

Run: `jq -e '.hooks | keys' .claude/settings.json`
Expected: `["PreToolUse","SessionStart","Stop"]`

- [ ] **Step 4: Rodar a suíte inteira**

Run: `bash .claude/tests/run-all.sh`
Expected: `OK: 7 arquivo(s) de teste, nenhuma falha`. Cole a saída completa na sessão — é o item 1 do DoD.

- [ ] **Step 5: Provar contra o repositório real, na `main`**

Rode cada um a partir do main tree (`/home/jvbat/projetos/lotus`) e confira a decisão:

```bash
cd /home/jvbat/projetos/lotus
R=$(git rev-parse --show-toplevel)

# nega: backend/ na main
jq -nc --arg cwd "$R" --arg fp "$R/backend/app/Teste.php" \
  '{session_id:"prova", cwd:$cwd, tool_name:"Write", tool_input:{file_path:$fp}}' \
  | bash .claude/hooks/guard-main.sh

# libera: docs/ na main (sem saida)
jq -nc --arg cwd "$R" --arg fp "$R/docs/nota.md" \
  '{session_id:"prova", cwd:$cwd, tool_name:"Write", tool_input:{file_path:$fp}}' \
  | bash .claude/hooks/guard-main.sh

# nega: a cauda depois de --
jq -nc --arg cwd "$R" --arg c 'pnpm lint -- --fix' \
  '{session_id:"prova", cwd:$cwd, tool_name:"Bash", tool_input:{command:$c}}' \
  | bash .claude/hooks/guard-main-shell.sh

# libera: pnpm lint (sem saida)
jq -nc --arg cwd "$R" --arg c 'pnpm lint' \
  '{session_id:"prova", cwd:$cwd, tool_name:"Bash", tool_input:{command:$c}}' \
  | bash .claude/hooks/guard-main-shell.sh
```

Expected: o primeiro e o terceiro emitem JSON com `"permissionDecision":"deny"`; o segundo e o quarto não emitem nada. Leia os dois motivos e confira que cada um diz a coisa certa — esse julgamento é o item 3 do DoD, e nenhuma asserção o substitui.

- [ ] **Step 6: Commit**

```bash
git add .claude/settings.json .claude/hooks .claude/tests
git commit -m "feat(harness): registra os cinco hooks de guarda"
```

- [ ] **Step 7: Relatar o limite do DoD**

Reporte ao João, sem marcar como provado: `settings.json` é lido na abertura da sessão, então **o disparo dos hooks não se prova dentro da sessão que os escreve**. A verificação do item 4 do DoD é abrir uma sessão nova nesta árvore e confirmar que o `session-start` imprime o inventário das lanes.

---

## Definition of Done

1. `bash .claude/tests/run-all.sh` verde, saída colada na sessão (Task 10, Step 4).
2. Os cinco hooks provados nos dois sentidos pela suíte (Tasks 5–9).
3. Prova manual na `main` do repositório real, com os motivos lidos e julgados (Task 10, Step 5).
4. `.claude/settings.json` versionado com os cinco hooks nos matchers corretos (Task 10, Step 1) — com o limite do Step 7 declarado, não marcado.

## Handoff de execução

```yaml
executor: claude
```

**Critério.** Tasks 1–9 são mecânicas e têm verificação executável, o que normalmente pediria `codex`. O que decide contra é a Task 10, Step 5: ler os motivos de recusa emitidos contra o repositório real e julgar se cada um diz a coisa certa é julgamento fora do plano, e é onde um erro de allowlist falha **aberto** — ou seja, passa despercebido por uma suíte verde. Uma política de segurança cuja falha é silenciosa não se entrega por verificação mecânica.

Vale também que este bloco cria o guarda que passa a governar as sessões seguintes; um engano na tabela de famílias não quebra um teste, quebra o trabalho de amanhã.
