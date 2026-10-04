# Bloco 36 — `harness-aceitacao-externa` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o portão de efeito externo do harness de blocos. O `aceitacao.sh` gera a tabela de
aceitação a partir da `## Verificação externa` da spec, no planejamento, e a confere no
fechamento; o `lane.sh aceitar` abre a lane curta onde o bloco que mesclou sem a prova volta a
fechar; os commands e o contrato do estado passam a usar os dois.

**Architecture:** `.claude/scripts/aceitacao.sh` é bash fino no molde do `lane.sh` — argumento,
raiz da árvore, leitura do `estado.md` e a chamada HTTP —, e a leitura e a escrita do markdown
moram em `.claude/scripts/lib/aceitacao.py`. O `lane.sh` ganha o verbo `aceitar`, com o portão e o
contrato do `abrir`, e o `abrir` passa a recusar pasta de bloco que já tem `estado.md`. Os
commands rodam os scripts em vez de descrever o portão em prosa, e a catraca do
`commands.tests.sh` cobra as linhas que os rodam.

**Tech Stack:** bash 5, python3 só com a biblioteca padrão, `curl`, `python3 -m http.server` (na
suíte), a suíte `.claude/tests/run-all.sh`.

**Spec:** [`spec.md`](./spec.md) (emendas E1–E6), sobre a §6 de
[`specs/2026-09-26-harness-paridade-eladecora-design.md`](../../specs/2026-09-26-harness-paridade-eladecora-design.md).
Referência portada: `Ela-Decora/ElaDecora-Brain@3b7cc1bf`, `.claude/scripts/aceitacao.ps1`.

**Código validado.** Todo arquivo deste plano foi montado e rodado no planejamento, numa cópia da
lane: cada vermelho e cada verde dos passos abaixo é o medido ali, e as edições, aplicadas em
ordem, chegam byte a byte ao estado que deu `OK: 17 arquivo(s) de teste, nenhuma falha`. Copie os
blocos como estão. Saída diferente da que o passo espera é achado: pare e relate, não ajuste o
teste para passar.

## Global Constraints

- **Contrato do `aceitacao.sh <gerar|conferir> <NN>`** (spec §1.1). Roda na raiz da árvore atual.
  A pasta do bloco é a única `docs/superpowers/blocos/<NN>-*/` com `estado.md`; a spec é a do
  `active_spec` dele; `efeito_externo` tem de ser `sim`. O alvo é `<pasta>/aceitacao.md`.
  - Recusa: `PORTAO RECUSOU: <motivo>` no stderr, **exit 2**, antes de escrever qualquer coisa. O
    exit 1 é só do veredito PENDENTE.
  - `gerar`: um aviso por resultado descartado e, por último,
    `ACEITACAO GERADA: <alvo> (<n> item(ns))`, exit 0.
  - `conferir`: uma linha `MEDIDO <n>: <método> <url> -> <código>, esperado <e>: OK|FALHOU` por
    prova automática, os avisos e, **na última linha**, `ACEITACAO OK: <n> item(ns)` (exit 0) ou
    `ACEITACAO PENDENTE: <k> de <n> item(ns): <números, separados por vírgula>` (exit 1).
- **Prova automática** (spec §1.4): `<alias> <GET|HEAD> <caminho> -> <código>`, com o alias em
  `^[a-z][a-z0-9-]*$`, o caminho começando em `/` e o código de três dígitos; `prova: nenhuma` é
  item manual. A chamada é
  `curl -q -sS -o /dev/null -w '%{http_code}' --max-time 30 --proto '=http,https'`, com `-I` só
  no `HEAD`, sem `-L`, sem cabeçalho e sem credencial. Falha de rede, ou saída que não é um
  código de três dígitos, mede `000`.
- **Aliases** (spec §1.5): `.claude/aceitacao-aliases.conf`, uma linha `<alias> <URL-base>`. O
  único marcador é `{LOTUS_DEV_HTTP_PORT}`, lido do `.env` da raiz da árvore — só dígitos, aspas
  aceitas, a última linha vence, `8080` sem ele. Depois da troca, a URL casa
  `^https?://[A-Za-z0-9.-]+(:[0-9]+)?$`.
- **Variáveis da suíte.** `ACEITACAO_ALIASES` troca o arquivo de aliases e `ACEITACAO_CURL` o
  binário do `curl`, como `LANE_PNPM` e `LANE_DOCKER` trocam os do `lane.sh`. **A suíte não sai
  para a rede externa.**
- **Contrato do `lane.sh aceitar <NN> [--modelo <alias>]`** (spec §2.3), o mesmo do `abrir`:
  recusa como `PORTAO RECUSOU: <motivo>`, exit 1, antes de criar qualquer coisa; falha no meio
  imprime `LANE PELA METADE`, com o que foi criado e o `lane.sh fechar <NN>` que desfaz; sucesso
  termina em `LANE ABERTA: <branch> em <árvore>`, a linha que o `/finalizar-bloco` lê para o
  `EnterWorktree`.
- **Assinaturas.**
  - Aguardando aceitação: `workflow_state: blocked`, `resume_state: ready_for_closure` e
    `blocker` começando por `aguardando aceitação`.
  - Lane de aceitação: `next_action: close_active_work_item aceitacao externa`, texto que só o
    `aceitar` escreve.
  - Branch da lane de aceitação: `docs/<NN>-<slug>`, ou `chore/<NN>-<slug>` quando o `branch`
    gravado no `estado.md` já é `docs/<NN>-<slug>`.
- **Nenhum campo novo no `estado.md`:** o `schema_version` fica `3`.
- **Texto.** Comentários e mensagens de scripts e testes sem acento, como os existentes; com
  acento só o que casa ou escreve conteúdo acentuado (o título `## Verificação externa`, o
  `blocker`, o `aceitacao.md`, o assunto do commit do `aceitar`). Commands e docs em português com
  acento, com a prosa quebrada em até 100 colunas.
- **bash 5 e python3 da biblioteca padrão.** Arquivo novo com modo `100644`, chamado por `bash`
  ou `python3`, como os existentes.
- **Trava de avulso.** Todo `*.tests.sh` abre com a linha que recusa rodar fora do `run-all.sh`, e
  o `avulso.tests.sh` a cobra. Os dois arquivos de teste novos já a trazem.
- **Git.** `git add` nomeia cada caminho, nunca `-A`, `.` ou diretório. Nunca `git stash`.
  Commits em Conventional Commits, em português, terminando com
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` — ou o modelo que de fato escreveu
  o commit (com `--max`, os implementadores são Opus).
- **Suíte.** `bash .claude/tests/run-all.sh` leva ~30 s; o veredito é a última linha e o código de
  saída. Os passos usam o **placar**: uma rodada só, que imprime as três primeiras `FALHA` dos
  arquivos cujo nome começa pelo prefixo `a` (cada uma com as duas linhas de detalhe), o placar
  `<arquivo>: ok=<n> falha=<n>` de cada um e a última linha da suíte. Com `a=aceitacao.`:

  ```bash
  bash .claude/tests/run-all.sh | awk -v a=aceitacao. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
  ```

  O trecho inteiro de um arquivo sai com
  `bash .claude/tests/run-all.sh | sed -n '/^== <arquivo>/,/^== /p'`.

## Review Focus

1. **Linha da tabela duplicada à mão** — o João copia a linha de um item para reescrevê-la e
   esquece a velha. Esperado: recusa nomeando o item, nunca a primeira ou a última valendo
   calada. Teste: `linha duplicada na tabela` (Task 1).
2. **`.env` com a porta entre aspas ou repetida** — `LOTUS_DEV_HTTP_PORT="8082"` depois de um
   `8081`. Esperado: vale a última linha, só os dígitos; sem `.env`, `8080`. Teste:
   `local le a ultima LOTUS_DEV_HTTP_PORT do .env, com aspas` (Task 4).
3. **`curl` que imprime algo que não é um código** — proxy, binário trocado ou saída repetida,
   como `200200`. Esperado: mede `000` e o item fica FALHOU, nunca OK por casar um prefixo.
   Teste: `saida que nao e um codigo mede 000` (Task 4).
4. **`estado.md` do main tree editado à mão antes do `aceitar`** — o João anota no corpo e roda o
   `/finalizar-bloco`. Esperado: recusa, porque a lane nasceria de um estado que a `main` não tem.
   Teste: `estado.md com mudanca local no main tree` (Task 2).
5. **Frontmatter sem um campo que o `aceitar` reescreve** — bloco antigo sem `lane_base`.
   Esperado: `LANE PELA METADE`, nomeando a branch criada e o `lane.sh fechar`, nunca uma lane
   incoerente calada. Teste: `estado sem lane_base` (Task 2).

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `.claude/scripts/lib/aceitacao.py` | lê a `## Verificação externa` e os aliases; lê e escreve o `aceitacao.md`; dá o veredito | 1, 4 |
| `.claude/scripts/aceitacao.sh` | argumento, raiz, `estado.md` e porta do `.env`; mede as provas com `curl` | 1, 4 |
| `.claude/aceitacao-aliases.conf` | os aliases `producao` e `local` | 1 |
| `.claude/tests/aceitacao.tests.sh` | `gerar` (Task 1) e `conferir` (Task 4) contra repositórios descartáveis | 1, 4 |
| `.claude/scripts/lane.sh` | verbo `aceitar`; o `abrir` recusa pasta com `estado.md` | 2 |
| `.claude/tests/lane-aceitar.tests.sh` | o verbo `aceitar` | 2 |
| `.claude/tests/lane-abrir.tests.sh` | a recusa nova do `abrir` | 2 |
| `.claude/hooks/lib/classificar-comando.py` | libera `lane.sh aceitar <NN> [--modelo <alias>]` na `main` | 3 |
| `.claude/tests/classificar-comando.tests.sh` | as formas do `aceitar` que passam e as que não | 3 |
| `.claude/tests/commands.tests.sh` | catraca das quatro linhas que rodam os portões | 5 |
| `.claude/commands/planejar-bloco.md` | Passos 3, 7 e 9: `aceitacao.sh gerar` | 5 |
| `.claude/commands/finalizar-bloco.md` | modo Aceitação, lane de aceitação, 6a com `conferir` e rede de segurança | 5 |
| `docs/superpowers/state.md`, `CLAUDE.md`, `AGENTS.md` | o contrato sem a exceção da PR de docs (E2) | 6 |
| `docs/estrutura-monolito.md`, `docs/superpowers/backlog.md` | mapa do harness; tabela `## Aguardando aceitação` | 7 |
| `docs/superpowers/blocos/36-harness-aceitacao-externa/prova-catraca.md` | evidência do DoD 1 e 2 | 8 |
| `docs/superpowers/blocos/36-harness-aceitacao-externa/prova-clone.md` | evidência do DoD 3 | 9 |

---

### Task 1: `aceitacao.sh gerar`

**Files:**
- Create: `.claude/scripts/lib/aceitacao.py`
- Create: `.claude/scripts/aceitacao.sh`
- Create: `.claude/aceitacao-aliases.conf`
- Create: `.claude/tests/aceitacao.tests.sh`

**Interfaces:**
- Consumes:
  - `raiz_de <dir>` (`.claude/hooks/lib/comum.sh`): a raiz da árvore git de `<dir>`; vazio fora
    de repositório.
  - `.claude/hooks/lib/ler-frontmatter.py <arquivo> <campo>...`: uma linha no stdout, com os
    valores separados por `\x1f` e `null` saindo vazio.
  - `.claude/tests/_assert.sh`: `DIR_TESTES`, `FALHAS_TESTE`,
    `assert_igual <esperado> <obtido> <título>`, `assert_contem <texto> <trecho> <título>`,
    `assert_nao_contem <texto> <trecho> <título>`, `criar_repo` (ecoa um repositório git
    descartável) e `registrar_descarte <caminho>`.
- Produces:
  - `bash .claude/scripts/aceitacao.sh gerar <NN>`, com o contrato do Global Constraints.
  - `python3 .claude/scripts/lib/aceitacao.py gerar <spec> <alvo> <aliases> <porta> <NN>`, e as
    funções que a Task 4 estende:
    - `Recusa`, a exceção que o `main` converte em `PORTAO RECUSOU`, exit 2;
    - `ler_itens(caminho) -> [{n, texto, prova}]`;
    - `ler_aliases(caminho, porta) -> {alias: url}`;
    - `classificar(itens, aliases, arquivo_aliases)`, que põe em cada item `auto` (`None` no
      manual, senão `{metodo, base, caminho, esperado}`) e `rotulo` (o texto da coluna Prova);
    - `ler_tabela(caminho) -> {n: {item, prova, resultado, data}}`;
    - `reaproveitar(itens, tabela, alvo) -> (valores, avisos)`, com `valores = {n: (resultado,
      data)}`;
    - `escrever_tabela(caminho, nn, itens, valores)` e `executar(args) -> int`.
  - No `aceitacao.tests.sh`, o que a Task 4 usa: `ACEITACAO_SH`; `_AC_P` (a pasta do bloco 50 de
    fixture); `_ac_t` (o temporário da suíte, com `aliases.conf`); `AC_ALIASES`, `AC_CURL` e
    `AC_R`; `ac_novo <efeito_externo> [<active_spec>]`; `ac_spec` (a spec pelo stdin);
    `ac_spec_padrao`; `ac_rodar <args>` (seta `AC_SAIDA`, `AC_COD` e `AC_ULTIMA`); `ac_tabela`;
    `ac_linha <n>`; `ac_recusa <trecho> <título>`; `ac_nada_escrito <título>`;
    `ac_manual <n> <resultado> <data>`.

- [ ] **Step 1: Conferir que os nomes não colidem.** A suíte faz `source` de todos os arquivos no
  mesmo shell.

```bash
grep -rnE '\b_?(ac|AC)_[A-Za-z]|ACEITACAO_SH' .claude/tests/ || echo livre
```

Expected: `livre`.

- [ ] **Step 2: Escrever o teste** — `.claude/tests/aceitacao.tests.sh`, conteúdo exato:

````bash
[[ -n ${DIR_TESTES:-} ]] || { printf 'rode pelo run-all.sh: %s nao roda avulso\n' "${BASH_SOURCE[0]}" >&2; exit 1; }
# Portao de efeito externo (spec do bloco 36, secoes 1 e 3): o aceitacao.sh
# contra repositorios descartaveis. Nenhuma prova sai para a rede externa:
# `gerar` nao mede nada, e `conferir` mede contra um http.server em
# 127.0.0.1 ou contra um curl falso que so anota os argumentos.

ACEITACAO_SH="$DIR_TESTES/../scripts/aceitacao.sh"
_AC_P=docs/superpowers/blocos/50-demo
_ac_t=$(mktemp -d "${TMPDIR:-/tmp}/lotus-aceitacao.XXXXXX"); registrar_descarte "$_ac_t"
printf 'teste http://teste.local\noutro-alias http://outro.local:8443\n' > "$_ac_t/aliases.conf"
AC_ALIASES="$_ac_t/aliases.conf"
AC_CURL=false

ac_novo() {
  # $1 = efeito_externo, $2 = active_spec (vazio vira null). Repo
  # descartavel novo em AC_R, com o estado.md do bloco 50.
  AC_R=$(criar_repo); registrar_descarte "$AC_R"
  mkdir -p "$AC_R/$_AC_P"
  printf -- '---\nschema_version: 3\nid: 50\nslug: 50-demo\nworkflow_state: ready_for_closure\nactive_spec: %s\nefeito_externo: %s\n---\n' \
    "${2:-null}" "$1" > "$AC_R/$_AC_P/estado.md"
}

ac_spec() { cat > "$AC_R/$_AC_P/spec.md"; }   # stdin = a spec do bloco 50

ac_spec_padrao() {
  ac_spec <<'SPEC'
# Bloco 50 — spec

## Desenho

1. Item numerado fora da secao nao conta.
   - prova: teste GET /fora -> 200

## Verificação externa

1. Publicar a rota /up, com o texto quebrado
   em duas linhas.
   - prova: `teste GET /up -> 200`
2. O João confere o e-mail de alerta.
   - prova: nenhuma

## Depois

1. Outro item fora da secao.
SPEC
}

ac_rodar() {
  # $@ = argumentos do aceitacao.sh, rodado de AC_R. Seta AC_SAIDA (stdout
  # e stderr), AC_COD e AC_ULTIMA.
  AC_SAIDA=$(cd "$AC_R" && ACEITACAO_ALIASES=$AC_ALIASES ACEITACAO_CURL=$AC_CURL \
    bash "$ACEITACAO_SH" "$@" 2>&1)
  AC_COD=$?
  AC_ULTIMA=$(printf '%s\n' "$AC_SAIDA" | tail -n 1)
}

ac_tabela() { cat "$AC_R/$_AC_P/aceitacao.md" 2>/dev/null; }

ac_linha() {
  # $1 = numero do item. A linha dele na tabela.
  ac_tabela | grep -E "^\| $1 \|"
}

ac_recusa() {
  # $1 = trecho do motivo, $2 = titulo. A recusa sai 2, pelo portao.
  assert_igual 2 "$AC_COD" "$2: sai 2"
  assert_contem "$AC_SAIDA" 'PORTAO RECUSOU' "$2: pelo portao"
  assert_contem "$AC_SAIDA" "$1" "$2: pelo motivo certo"
}

ac_nada_escrito() {
  # $1 = titulo.
  if [[ -e $AC_R/$_AC_P/aceitacao.md ]]; then
    FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA %s: o aceitacao.md nasceu\n' "$1"
  else
    printf '  ok    %s: nada escrito\n' "$1"
  fi
}

ac_manual() {
  # $1 = numero do item manual, $2 = resultado, $3 = data. Escreve as duas
  # celulas como o Joao escreveria.
  sed -i -E "s/^\| $1 \| (.*) \| manual \|  \|  \|\$/| $1 | \1 | manual | $2 | $3 |/" \
    "$AC_R/$_AC_P/aceitacao.md"
}

# --- gerar: a tabela
ac_novo sim "$_AC_P/spec.md"; ac_spec_padrao
ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'gerar sai 0'
assert_igual "ACEITACAO GERADA: $_AC_P/aceitacao.md (2 item(ns))" "$AC_ULTIMA" \
  'gerar anuncia o caminho e a contagem'
assert_igual '| 1 | Publicar a rota /up, com o texto quebrado em duas linhas. | `teste GET /up -> 200` |  |  |' \
  "$(ac_linha 1)" 'item automatico, com a linha de continuacao no texto'
assert_igual '| 2 | O João confere o e-mail de alerta. | manual |  |  |' "$(ac_linha 2)" \
  'prova nenhuma vira item manual'
assert_igual 2 "$(ac_tabela | grep -cE '^\| [0-9]+ \|')" \
  'so os itens da secao: o numerado de antes e o de depois ficam fora'
assert_contem "$(ac_tabela)" '# Bloco 50 — aceitação externa' 'titulo da tabela'
assert_contem "$(ac_tabela)" '| # | Item | Prova | Resultado | Data |' 'cabecalho de cinco colunas'
cp "$AC_R/$_AC_P/aceitacao.md" "$_ac_t/antes.md"
ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'gerar de novo sai 0'
if cmp -s "$_ac_t/antes.md" "$AC_R/$_AC_P/aceitacao.md"; then
  printf '  ok    gerar e idempotente\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA gerar e idempotente\n'
fi
ac_manual 2 'recebido as 10h' 2026-10-04
ac_rodar gerar 50
assert_igual '| 2 | O João confere o e-mail de alerta. | manual | recebido as 10h | 2026-10-04 |' \
  "$(ac_linha 2)" 'gerar preserva o resultado manual'
assert_nao_contem "$AC_SAIDA" 'aviso' 'nada descartado, nenhum aviso'

# --- identidade: texto mudado e prova mudada descartam, com aviso
sed -i 's/O João confere o e-mail de alerta./O João confere o SMS de alerta./' "$AC_R/$_AC_P/spec.md"
ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'texto mudado: gerar sai 0'
assert_contem "$AC_SAIDA" 'aviso: o item 2 mudou na spec' 'texto mudado: avisa o descarte'
assert_igual '| 2 | O João confere o SMS de alerta. | manual |  |  |' "$(ac_linha 2)" \
  'texto mudado: o resultado volta a vazio'
sed -i -E 's/^\| 1 \| (.*) \|  \|  \|$/| 1 | \1 | `200`, esperado `200`: OK | 2026-10-01 |/' \
  "$AC_R/$_AC_P/aceitacao.md"
sed -i 's/- prova: `teste GET \/up -> 200`/- prova: nenhuma/' "$AC_R/$_AC_P/spec.md"
ac_rodar gerar 50
assert_contem "$AC_SAIDA" 'aviso: o item 1 mudou na spec' 'prova mudada, texto igual: avisa o descarte'
assert_igual '| 1 | Publicar a rota /up, com o texto quebrado em duas linhas. | manual |  |  |' \
  "$(ac_linha 1)" 'a medicao antiga nao vale como palavra do Joao'

# --- pipe: escapado na escrita, lido de volta; cru, recusado
ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificação externa

1. Conferir a | b no painel.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
assert_igual '| 1 | Conferir a \| b no painel. | manual |  |  |' "$(ac_linha 1)" '| do texto sai escrito \|'
sed -i -E 's/^(\| 1 \| .* \| manual \| ) \|  \|$/\1x \\| y | 2026-10-04 |/' "$AC_R/$_AC_P/aceitacao.md"
ac_rodar gerar 50
assert_igual '| 1 | Conferir a \| b no painel. | manual | x \| y | 2026-10-04 |' "$(ac_linha 1)" \
  '\| no resultado e lido e reescrito igual'
cp "$AC_R/$_AC_P/aceitacao.md" "$_ac_t/pipe.md"
sed -i 's/x \\| y/x | y/' "$AC_R/$_AC_P/aceitacao.md"
cp "$AC_R/$_AC_P/aceitacao.md" "$_ac_t/pipe-cru.md"
ac_rodar gerar 50
ac_recusa 'cinco colunas' '| cru dentro de celula'
assert_contem "$AC_SAIDA" 'x | y' '| cru: a recusa mostra a linha'
if cmp -s "$_ac_t/pipe-cru.md" "$AC_R/$_AC_P/aceitacao.md"; then
  printf '  ok    | cru: a tabela fica como estava\n'
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA | cru: a tabela fica como estava\n'
fi
cp "$_ac_t/pipe.md" "$AC_R/$_AC_P/aceitacao.md"
grep -E '^\| 1 \|' "$_ac_t/pipe.md" >> "$AC_R/$_AC_P/aceitacao.md"
ac_rodar gerar 50
ac_recusa 'duas linhas para o item 1' 'linha duplicada na tabela'

# --- leitura da secao
ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificacao externa

1. Sem acento no titulo.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
assert_igual "ACEITACAO GERADA: $_AC_P/aceitacao.md (1 item(ns))" "$AC_ULTIMA" 'titulo sem acento casa'

ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificação externa

O formato, com exemplo em cerca:

```markdown
1. Exemplo dentro da cerca.
   - prova: teste GET /exemplo -> 200
## Titulo dentro da cerca
```

1. Item real.
   - prova: nenhuma
1. Segundo item real, com o mesmo digito.
   - prova: nenhuma

~~~
3. Outro exemplo, em cerca de til.
~~~
1. Terceiro.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
assert_igual "ACEITACAO GERADA: $_AC_P/aceitacao.md (3 item(ns))" "$AC_ULTIMA" \
  'item em cerca nao conta, e titulo em cerca nao fecha a secao'
assert_contem "$(ac_linha 2)" 'Segundo item real' 'numerado pela posicao (1. 1. 1.)'
assert_contem "$(ac_linha 3)" 'Terceiro.' 'o terceiro e o 3'

ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificação externa

```
1. Cerca que nunca fecha.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
ac_recusa 'cerca' 'cerca aberta e nunca fechada'
ac_nada_escrito 'cerca aberta'

ac_novo sim "$_AC_P/spec.md"
printf '# Bloco 50\n\n## Desenho\n\nSem a secao.\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'nao tem a secao' 'secao ausente'
ac_nada_escrito 'secao ausente'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\nNenhuma. `efeito_externo: nao`.\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'nao tem item numerado' 'zero itens'
ac_nada_escrito 'zero itens'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Um.\n   - prova: nenhuma\n\n## Verificação externa\n\n1. Dois.\n   - prova: nenhuma\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'secoes ## Verificacao externa' 'duas secoes'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Sem prova.\n2. Com prova.\n   - prova: nenhuma\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'item 1 da ## Verificacao externa nao tem a linha' 'item sem - prova:'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Duas provas.\n   - prova: nenhuma\n   - prova: teste GET /up -> 200\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'tem 2 linhas' 'item com duas - prova:'
ac_nada_escrito 'duas provas'

# --- prova: formato, alias, ancora e shell
for _ac_p in 'teste POST /up -> 200' 'teste GET /up 200' 'teste GET /up -> 20' 'teste GET @evil.example/x -> 200' ''; do
  ac_novo sim "$_AC_P/spec.md"
  printf '## Verificação externa\n\n1. Item.\n   - prova: %s\n' "$_ac_p" | ac_spec
  ac_rodar gerar 50
  ac_recusa 'fora do formato' "prova [$_ac_p] recusada ja no gerar"
done
ac_nada_escrito 'prova fora do formato'
ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Item.\n   - prova: desconhecido GET /up -> 200\n' | ac_spec
ac_rodar gerar 50
ac_recusa 'alias `desconhecido`' 'alias desconhecido'
ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Item.\n   - prova: $(touch %s) GET /up -> 200\n' "$_ac_t/pwned" | ac_spec
ac_rodar gerar 50
ac_recusa 'fora do formato' 'prova com $(...)'
if [[ -e $_ac_t/pwned ]]; then
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA a prova com $(...) foi executada\n'
else
  printf '  ok    a prova com $(...) nunca vira shell\n'
fi

# --- estado.md, pasta e argumentos
ac_novo nao "$_AC_P/spec.md"; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'efeito_externo: nao' 'efeito_externo nao'
ac_novo null "$_AC_P/spec.md"; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'efeito_externo: null' 'efeito_externo null'
ac_novo sim ''; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'nao tem active_spec' 'active_spec null'
ac_novo sim "$_AC_P/outra-spec.md"; ac_spec_padrao
ac_rodar gerar 50
ac_recusa 'que nao existe' 'active_spec para arquivo que nao existe'
ac_nada_escrito 'active_spec ausente'
ac_rodar gerar 51
ac_recusa 'nenhuma pasta' 'bloco sem pasta'
mkdir -p "$AC_R/docs/superpowers/blocos/50-outro"
cp "$AC_R/$_AC_P/estado.md" "$AC_R/docs/superpowers/blocos/50-outro/estado.md"
ac_rodar gerar 50
ac_recusa 'mais de uma pasta' 'duas pastas com estado.md'
ac_rodar gerar
ac_recusa 'uso' 'sem NN'
ac_rodar gerar 50 extra
ac_recusa 'uso' 'argumento a mais'
ac_rodar apagar 50
ac_recusa 'desconhecido' 'verbo desconhecido'
ac_rodar gerar 050
ac_recusa 'numero' 'NN com zero a esquerda'
AC_SAIDA=$(cd "$_ac_t" && bash "$ACEITACAO_SH" gerar 50 2>&1); AC_COD=$?
ac_recusa 'fora de um repositorio' 'fora de repositorio'

# --- aliases: so URL-base, sem userinfo, sem caminho, sem marcador alheio
ac_novo sim "$_AC_P/spec.md"; ac_spec_padrao
for _ac_u in 'http://user@teste.local' 'http://teste.local/x' 'http://teste.local/' 'ftp://teste.local' 'http://teste.local:{OUTRA}'; do
  printf 'teste %s\n' "$_ac_u" > "$_ac_t/ruim.conf"
  AC_ALIASES="$_ac_t/ruim.conf" ac_rodar gerar 50
  ac_recusa 'fora de ^https?' "alias com URL [$_ac_u] recusado"
done
printf 'teste http://a.local\nteste http://b.local\n' > "$_ac_t/ruim.conf"
AC_ALIASES="$_ac_t/ruim.conf" ac_rodar gerar 50
ac_recusa 'duas vezes' 'alias repetido'
printf 'teste\n' > "$_ac_t/ruim.conf"
AC_ALIASES="$_ac_t/ruim.conf" ac_rodar gerar 50
ac_recusa 'nao e `<alias> <URL-base>`' 'linha sem URL'
ac_nada_escrito 'aliases invalidos'
printf '## Verificação externa\n\n1. Item.\n   - prova: producao GET /up -> 200\n' | ac_spec
AC_ALIASES='' ac_rodar gerar 50
assert_igual 0 "$AC_COD" 'o aceitacao-aliases.conf real e valido e tem producao'
printf '## Verificação externa\n\n1. Item.\n   - prova: teste GET /up -> 200\n' | ac_spec
AC_ALIASES='' ac_rodar gerar 50
ac_recusa 'alias `teste`' 'alias fora do conf real e recusado'
````

- [ ] **Step 3: Rodar e ver o vermelho certo**

```bash
bash .claude/tests/run-all.sh | awk -v a=aceitacao. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected:
- a primeira `FALHA` é `gerar sai 0`, com `esperado: [0]` e `obtido:   [127]`; a segunda mostra o
  `aceitacao.sh: No such file or directory` — o script ainda não existe;
- `aceitacao.tests.sh: ok=9 falha=126`;
- `FALHOU: 126 asercao(oes)`.

- [ ] **Step 4: Escrever o `.claude/aceitacao-aliases.conf`**

```text
# Aliases das provas da `## Verificação externa` (spec do bloco 36, §1.5).
# Uma linha `<alias> <URL-base>` por alias: sem segredo, sem userinfo, sem
# caminho e sem barra final. O único marcador aceito é o da porta HTTP do
# .env da raiz da árvore, que vale 8080 sem ele. Nada é avaliado como shell.
producao https://app.lotusotec.cl
local    http://localhost:{LOTUS_DEV_HTTP_PORT}
```

- [ ] **Step 5: Escrever o `.claude/scripts/lib/aceitacao.py`**

```python
#!/usr/bin/env python3
"""Le a secao `## Verificacao externa` da spec de um bloco e le e escreve o
aceitacao.md dele, para o aceitacao.sh (spec do bloco 36, secao 1). Porta
das defesas do `aceitacao.ps1` do ElaDecora-Brain@3b7cc1bf.

Uso, sempre da raiz da arvore (os caminhos sao relativos a ela):
  aceitacao.py gerar <spec> <alvo> <aliases> <porta> <NN>
      Cria ou completa <alvo>, preservando o resultado de todo item cuja
      identidade bate. stdout: um aviso por resultado descartado e, por
      ultimo, `ACEITACAO GERADA: <alvo> (<n> item(ns))`.
  <porta> e o LOTUS_DEV_HTTP_PORT que o aceitacao.sh leu do .env da raiz.

Saida: 0 gerado; 2 recusa, com `PORTAO RECUSOU: <motivo>` no stderr e nada
escrito. Excecao inesperada tambem sai 2: o exit 1 fica para o veredito
PENDENTE do `conferir`.
"""

import os
import re
import sys
import traceback

TITULO = re.compile(r"^(#{1,2})\s+(.*?)\s*$")
SECAO = re.compile(r"^verifica(ç|c)(ã|a)o externa$", re.I)
CERCA = re.compile(r"^(`{3,}|~{3,})(.*)$")
ITEM = re.compile(r"^(\d+)\.\s+(.*)$")
LINHA_PROVA = re.compile(r"^\s*-\s+prova:(.*)$")
PROVA = re.compile(r"^([a-z][a-z0-9-]*)\s+(GET|HEAD)\s+(/\S*)\s*->\s*(\d{3})$")
ALIAS = re.compile(r"^[a-z][a-z0-9-]*$")
URL_BASE = re.compile(r"^https?://[A-Za-z0-9.-]+(:[0-9]+)?$")
MARCADOR = "{LOTUS_DEV_HTTP_PORT}"
LINHA_TABELA = re.compile(r"^\|\s*(\d+)\s*\|")
PIPE = re.compile(r"(?<!\\)\|")
USO = "uso: aceitacao.py gerar <spec> <alvo> <aliases> <porta> <NN>"

CABECALHO = """# Bloco {nn} — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|"""


class Recusa(Exception):
    pass


def ler_linhas(caminho):
    try:
        with open(caminho, encoding="utf-8") as f:
            return f.read().split("\n")
    except (OSError, UnicodeDecodeError) as e:
        raise Recusa("nao consegui ler %s: %s" % (caminho, e))


def normalizar(texto):
    return re.sub(r"\s+", " ", texto).strip()


def fechar_item(atual, itens):
    if atual is None:
        return
    n = atual["n"]
    if not atual["provas"]:
        raise Recusa("o item %d da ## Verificacao externa nao tem a linha `- prova:`; "
                     "item manual declara `- prova: nenhuma`" % n)
    if len(atual["provas"]) > 1:
        raise Recusa("o item %d da ## Verificacao externa tem %d linhas `- prova:`; "
                     "deixe uma so" % (n, len(atual["provas"])))
    texto = normalizar(" ".join(atual["partes"]))
    if not texto:
        raise Recusa("o item %d da ## Verificacao externa nao tem texto" % n)
    itens.append({"n": n, "texto": texto, "prova": atual["provas"][0]})


def ler_itens(caminho):
    """Itens numerados da secao, na ordem: [{n, texto, prova}]. `n` e a
    posicao, nunca o digito escrito; `prova` e o valor cru da linha
    `- prova:`. Cerca de codigo e ignorada por inteiro, dentro e fora da
    secao: uma spec documenta o formato com exemplo em cerca."""
    itens, atual = [], None
    dentro = coletando = False
    secoes = 0
    cerca = None  # (caractere, tamanho) da cerca aberta
    for linha in ler_linhas(caminho):
        m = CERCA.match(linha.strip())
        if cerca:
            if m and m.group(1)[0] == cerca[0] and len(m.group(1)) >= cerca[1] \
                    and not m.group(2).strip():
                cerca = None
            continue
        if m:
            cerca = (m.group(1)[0], len(m.group(1)))
            coletando = False
            continue
        t = TITULO.match(linha)
        if t:
            if dentro:
                fechar_item(atual, itens)
                atual = None
            titulo = re.sub(r"\s+#+$", "", t.group(2))
            dentro = len(t.group(1)) == 2 and bool(SECAO.match(titulo))
            secoes += dentro
            coletando = False
            continue
        if not dentro:
            continue
        i = ITEM.match(linha)
        if i:
            fechar_item(atual, itens)
            atual = {"n": len(itens) + 1, "partes": [i.group(2)], "provas": []}
            coletando = True
            continue
        p = LINHA_PROVA.match(linha)
        if p:
            if atual is None:
                raise Recusa("linha `- prova:` fora de item na ## Verificacao externa: %s"
                             % linha.strip())
            atual["provas"].append(p.group(1))
            coletando = False
            continue
        if coletando and linha.strip() and linha[:1].isspace():
            atual["partes"].append(linha)
        else:
            coletando = False
    if cerca:
        raise Recusa("a spec tem uma cerca de codigo que abre e nao fecha; cerca "
                     "desbalanceada e erro de spec, nao secao vazia")
    if dentro:
        fechar_item(atual, itens)
    if secoes == 0:
        raise Recusa("a spec nao tem a secao ## Verificacao externa; secao ausente e "
                     "spec incompleta, nao bloco sem itens")
    if secoes > 1:
        raise Recusa("a spec tem %d secoes ## Verificacao externa; deixe uma so" % secoes)
    if not itens:
        raise Recusa("a ## Verificacao externa nao tem item numerado, e o estado.md diz "
                     "efeito_externo: sim")
    return itens


def ler_aliases(caminho, porta):
    """{alias: URL-base}. O marcador {LOTUS_DEV_HTTP_PORT} vira <porta>; nada
    e avaliado como shell."""
    aliases = {}
    for num, linha in enumerate(ler_linhas(caminho), 1):
        linha = linha.split("#", 1)[0].strip()
        if not linha:
            continue
        partes = linha.split()
        if len(partes) != 2 or not ALIAS.match(partes[0]):
            raise Recusa("a linha %d de %s nao e `<alias> <URL-base>`" % (num, caminho))
        alias, url = partes[0], partes[1].replace(MARCADOR, porta)
        if alias in aliases:
            raise Recusa("o alias `%s` aparece duas vezes em %s" % (alias, caminho))
        if not URL_BASE.match(url):
            raise Recusa("o alias `%s` de %s vale `%s`, fora de ^https?://<host>(:<porta>)?$ "
                         "(sem userinfo, sem caminho, sem barra final, e %s e o unico "
                         "marcador)" % (alias, caminho, url, MARCADOR))
        aliases[alias] = url
    return aliases


def classificar(itens, aliases, arquivo_aliases):
    """Da a cada item `auto` (None no manual) e `rotulo`, o texto da coluna
    Prova. Prova fora do formato, ou com alias desconhecido, e recusa."""
    for it in itens:
        valor = normalizar(it["prova"].strip().strip("`"))
        if valor.lower() == "nenhuma":
            it["auto"], it["rotulo"] = None, "manual"
            continue
        m = PROVA.match(valor)
        if not m:
            raise Recusa("o item %d declara a prova `%s`, fora do formato `<alias> <GET|HEAD> "
                         "<caminho> -> <codigo>`, com o caminho comecando em /; item manual "
                         "declara `nenhuma`" % (it["n"], valor))
        alias, metodo, caminho, esperado = m.groups()
        if alias not in aliases:
            raise Recusa("o item %d usa o alias `%s`, que nao esta em %s"
                         % (it["n"], alias, arquivo_aliases))
        it["auto"] = {"metodo": metodo, "base": aliases[alias], "caminho": caminho,
                      "esperado": esperado}
        it["rotulo"] = "`%s %s %s -> %s`" % (alias, metodo, caminho, esperado)


def escapar(celula):
    return celula.replace("|", "\\|")


def desescapar(celula):
    return celula.replace("\\|", "|")


def ler_tabela(caminho):
    """{n: {item, prova, resultado, data}} das linhas `| <n> | ...` do
    aceitacao.md; {} quando ele nao existe. Linha que nao da cinco colunas
    e recusa: com um `|` cru, nao da para saber de que celula ele veio."""
    if not os.path.exists(caminho):
        return {}
    tabela = {}
    for linha in ler_linhas(caminho):
        m = LINHA_TABELA.match(linha)
        if not m:
            continue
        celulas = PIPE.split(linha)
        if len(celulas) != 7 or celulas[6].strip():
            raise Recusa("a linha do item %s de %s nao tem as cinco colunas | # | Item | Prova "
                         "| Resultado | Data |; um `|` dentro de celula se escreve `\\|`. "
                         "Linha: %s" % (m.group(1), caminho, linha))
        n = int(m.group(1))
        if n in tabela:
            raise Recusa("%s tem duas linhas para o item %d" % (caminho, n))
        item, prova, resultado, data = (desescapar(c.strip()) for c in celulas[2:6])
        tabela[n] = {"item": item, "prova": prova, "resultado": resultado, "data": data}
    return tabela


def mesmo_item(it, linha):
    """A identidade e o texto normalizado mais a prova: trocar so a prova
    (automatica por `nenhuma`) tambem descarta o resultado."""
    return normalizar(linha["item"]) == it["texto"] \
        and normalizar(linha["prova"].strip("`")) == normalizar(it["rotulo"].strip("`"))


def reaproveitar(itens, tabela, alvo):
    """({n: (resultado, data)}, avisos). Vale so o registro cujo item, na
    mesma posicao, tem a mesma identidade; o resto e descartado, com aviso
    quando havia algo escrito."""
    valores, avisos = {}, []
    for n, linha in sorted(tabela.items()):
        it = itens[n - 1] if 1 <= n <= len(itens) else None
        if it is not None and mesmo_item(it, linha):
            valores[n] = (linha["resultado"], linha["data"])
        elif linha["resultado"] or linha["data"]:
            motivo = ("o item %d mudou na spec (texto ou prova)" % n) if it \
                else ("a spec nao tem mais o item %d" % n)
            avisos.append("aviso: %s; o resultado gravado em %s foi descartado" % (motivo, alvo))
    return valores, avisos


def escrever_tabela(caminho, nn, itens, valores):
    linhas = [CABECALHO.format(nn=nn)]
    for it in itens:
        resultado, data = valores.get(it["n"], ("", ""))
        celulas = [str(it["n"]), it["texto"], it["rotulo"], resultado, data]
        linhas.append("| " + " | ".join(escapar(c) for c in celulas) + " |")
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(linhas) + "\n")


def executar(args):
    if len(args) != 6 or args[0] != "gerar":
        raise Recusa(USO)
    spec, alvo, arquivo_aliases, porta, nn = args[1:]
    itens = ler_itens(spec)
    classificar(itens, ler_aliases(arquivo_aliases, porta), arquivo_aliases)
    tabela = ler_tabela(alvo)
    valores, avisos = reaproveitar(itens, tabela, alvo)
    escrever_tabela(alvo, nn, itens, valores)
    for a in avisos:
        print(a)
    print("ACEITACAO GERADA: %s (%d item(ns))" % (alvo, len(itens)))
    return 0


def main(argv):
    try:
        return executar(argv[1:])
    except Recusa as e:
        sys.stderr.write("PORTAO RECUSOU: %s\n" % e)
        return 2
    except Exception:
        traceback.print_exc()
        sys.stderr.write("PORTAO RECUSOU: erro interno do aceitacao.py\n")
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

- [ ] **Step 6: Escrever o `.claude/scripts/aceitacao.sh`**

```bash
#!/usr/bin/env bash
# Portao de efeito externo do /finalizar-bloco (spec do bloco 36, secao 1).
# `gerar` monta o aceitacao.md do bloco a partir da secao
# `## Verificacao externa` da spec dele. Existe como script, e nao como prosa
# no command, porque portao escrito em prosa o agente executa de cabeca e
# pula (a licao do aceitacao.ps1 do ElaDecora).
#
# Contrato: recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, com exit
# 2, antes de escrever qualquer coisa. A leitura e a escrita do markdown
# moram em lib/aceitacao.py; aqui ficam o argumento e a raiz da arvore. O
# arquivo de aliases entra por ACEITACAO_ALIASES, para a suite usar o dela.

DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$DIR/../hooks/lib/comum.sh"

LER_FM="$DIR/../hooks/lib/ler-frontmatter.py"
ACEITACAO_PY="$DIR/lib/aceitacao.py"
ALIASES=${ACEITACAO_ALIASES:-$DIR/../aceitacao-aliases.conf}
PADRAO_NN='^[1-9][0-9]*$'
# Unit Separator (0x1F), nao TAB: ver o docstring do ler-frontmatter.py.
SEP=$'\x1f'

recusar() {
  printf 'PORTAO RECUSOU: %s\n' "$1" >&2
  exit 2
}

(( $# == 2 )) || recusar 'uso: aceitacao.sh gerar <NN>'
VERBO=$1
NN=$2
[[ $VERBO == gerar ]] || recusar "verbo '$VERBO' desconhecido; use gerar"
[[ $NN =~ $PADRAO_NN ]] || recusar "NN '$NN' nao e numero de ficha"

RAIZ=$(raiz_de "$PWD")
[[ -n $RAIZ ]] || recusar "fora de um repositorio git ($PWD)"
cd "$RAIZ" || recusar "nao deu para entrar em $RAIZ"

# A pasta do bloco e a unica docs/superpowers/blocos/<NN>-*/ com estado.md.
estados=()
for e in docs/superpowers/blocos/"$NN"-*/estado.md; do
  [[ -f $e ]] && estados+=("$e")
done
(( ${#estados[@]} > 0 )) || recusar "nenhuma pasta docs/superpowers/blocos/$NN-*/ com estado.md nesta arvore"
(( ${#estados[@]} == 1 )) || recusar "mais de uma pasta do bloco $NN com estado.md: ${estados[*]}"
PASTA=${estados[0]%/estado.md}
ALVO=$PASTA/aceitacao.md

SPEC='' EFEITO=''
IFS=$SEP read -r SPEC EFEITO < <(python3 "$LER_FM" "${estados[0]}" active_spec efeito_externo)
[[ $EFEITO == sim ]] \
  || recusar "$PASTA/estado.md diz efeito_externo: ${EFEITO:-null}; o aceitacao.sh so roda com sim"
[[ -n $SPEC ]] || recusar "$PASTA/estado.md nao tem active_spec"
[[ -f $SPEC ]] || recusar "o active_spec de $PASTA/estado.md aponta para $SPEC, que nao existe"

# O valor do marcador {LOTUS_DEV_HTTP_PORT}: o .env da raiz lido como o
# offset_da_arvore do lane.sh o le (so digitos; a ultima linha vence), e
# 8080 sem .env ou sem a chave.
PORTA=$(sed -nE "s/^[[:space:]]*LOTUS_DEV_HTTP_PORT=[\"']?([0-9]+)[\"']?[[:space:]]*\$/\1/p" \
  .env 2>/dev/null | tail -n 1)
[[ -n $PORTA ]] || PORTA=8080

case $VERBO in
  gerar)
    python3 "$ACEITACAO_PY" gerar "$SPEC" "$ALVO" "$ALIASES" "$PORTA" "$NN"
    cod=$?
    (( cod == 0 || cod == 2 )) || recusar "lib/aceitacao.py saiu $cod"
    exit "$cod"
    ;;
esac
```

- [ ] **Step 7: Rodar e ver o verde**

```bash
bash .claude/tests/run-all.sh | awk -v a=aceitacao. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: `aceitacao.tests.sh: ok=135 falha=0` e `OK: 16 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 8: Commit.** É o primeiro commit do bloco: o `/executar-bloco` (Passo 4 dele) manda
  levar junto o `docs/superpowers/blocos/36-harness-aceitacao-externa/estado.md` em `executing`.

```bash
git add .claude/scripts/lib/aceitacao.py .claude/scripts/aceitacao.sh \
        .claude/aceitacao-aliases.conf .claude/tests/aceitacao.tests.sh
git commit -m "feat(36): aceitacao.sh gerar lê a Verificação externa da spec e escreve o aceitacao.md

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `lane.sh aceitar` e a recusa nova do `abrir`

**Files:**
- Modify: `.claude/scripts/lane.sh`
- Create: `.claude/tests/lane-aceitar.tests.sh`
- Modify: `.claude/tests/lane-abrir.tests.sh`

**Interfaces:**
- Consumes:
  - `.claude/tests/_lane.sh`: `LANE_SH`, `LER_FM_TESTE`, `US` (`\x1f`); `criar_main_lane` (ecoa
    um main tree descartável na `main`, dentro de um pai próprio, com o backlog de fixture);
    `rodar_lane <dir> <args>` (seta `SAIDA_LANE` e `CODIGO_LANE`; `FAKE_PNPM` e `FAKE_DOCKER`
    trocam os binários); `lane_manual <main> <branch>` (worktree irmã sem o `abrir`; ecoa o
    caminho); `assert_recusa <trecho> <título>`; `criar_falso <dir> <nome> [<código>]` (ecoa o
    caminho e anota cada chamada em `<caminho>.log`); `portas_do_env <.env>`.
  - `coerencia_da_lane <estado.md> <branch> <árvore>` (`.claude/hooks/lib/estados.sh`): vazio
    quando a lane é coerente.
  - `nada_criado <main> <título>`, do próprio `lane-abrir.tests.sh`.
  - No `lane.sh`: `recusar`, `emitir`, `raiz_ou_recusa`, `exigir_main_tree <verbo>`,
    `lanes_vivas` (`NN␟caminho␟branch` por lane), `offset_livre`, `descrever_offsets`,
    `escrever_env <árvore> <offset>`, `falhar_no_meio <NN> <etapa>`, e as variáveis `CRIADO`,
    `RAIZ`, `PRINCIPAL`, `LER_FM`, `SEP`, `TETO_LANES`, `PADRAO_NN`, `PADRAO_SLUG`,
    `PADRAO_ALIAS`, `PADRAO_LANE` e `ARV_BRANCH`.
- Produces:
  - `bash .claude/scripts/lane.sh aceitar <NN> [--modelo <alias>]`, com o contrato do Global
    Constraints; o commit da reabertura é `chore(<NN>): abre a lane de aceitação`.
  - No `lane.sh`: `branches_sem_arvore` (`NN␟branch` por branch de lane sem worktree, extraída
    do `descobrir`), `aguardando_aceitacao <estado.md>` (sai 0 na assinatura de aguardando
    aceitação), `reabrir_estado` e `verbo_aceitar`.
  - A recusa nova do `abrir`, `o bloco <NN> ja passou por lane …`, que aponta
    `/finalizar-bloco <NN>` quando o bloco espera aceitação.

- [ ] **Step 1: Conferir que os nomes não colidem**

```bash
grep -rnoE '\b_la[A-Za-z0-9]*\b|\bmesclado\b|\bnada_criado_aceitar\b' .claude/tests/ | grep -v ':_lane$' || echo livre
```

Expected: `livre`.

- [ ] **Step 2: Escrever o teste** — `.claude/tests/lane-aceitar.tests.sh`, conteúdo exato:

```bash
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
```

- [ ] **Step 3: O caso novo do `lane-abrir.tests.sh`**, entre a recusa 2 e a 3

Edição única — troque:

```bash
# --- 2. a ficha existe e o slug e o dela
rodar_lane "$_ab1" abrir 99 chore qualquer-coisa
assert_recusa 'nao existe' 'ficha inexistente'
rodar_lane "$_ab1" abrir 33 chore outro-slug
assert_recusa 'nao bate' 'slug diferente do da ficha'
nada_criado "$_ab1" 'recusa 2'
```

por:

```bash
# --- 2. a ficha existe e o slug e o dela
rodar_lane "$_ab1" abrir 99 chore qualquer-coisa
assert_recusa 'nao existe' 'ficha inexistente'
rodar_lane "$_ab1" abrir 33 chore outro-slug
assert_recusa 'nao bate' 'slug diferente do da ficha'
nada_criado "$_ab1" 'recusa 2'

# --- 2. ... e o bloco nunca passou por lane (spec do bloco 36, 2.6)
_ab2=$(criar_main_lane); registrar_descarte "$(dirname "$_ab2")"
_ab2e="$_ab2/docs/superpowers/blocos/33-harness-sinal-de-contexto-cheio/estado.md"
mkdir -p "$(dirname "$_ab2e")"
printf -- '---\nworkflow_state: closed\nresume_state: null\nblocker: null\n---\n' > "$_ab2e"
rodar_lane "$_ab2" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja passou por lane' 'pasta do bloco com estado.md'
assert_contem "$SAIDA_LANE" 'sobrescreveria' 'estado.md existente: diz o que o abrir faria'
printf -- '---\nworkflow_state: blocked\nresume_state: ready_for_closure\nblocker: "aguardando aceitação depois do merge: itens 1"\n---\n' > "$_ab2e"
rodar_lane "$_ab2" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'ja passou por lane' 'bloco aguardando aceitacao'
assert_contem "$SAIDA_LANE" '/finalizar-bloco 33' 'aguardando aceitacao: aponta o /finalizar-bloco'
nada_criado "$_ab2" 'recusa 2, estado.md existente'
```

- [ ] **Step 4: Rodar e ver o vermelho certo**

```bash
bash .claude/tests/run-all.sh | awk -v a=lane-a '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected:
- as três primeiras `FALHA` são do `lane-abrir`: `pasta do bloco com estado.md: sai 1` (com
  `obtido:   [0]`), `…: pelo portao` e `…: pelo motivo certo` — o `abrir` ainda abre a lane;
- `lane-abrir.tests.sh: ok=122 falha=8`; as outras cinco são `estado.md existente: diz o que o
  abrir faria`, `bloco aguardando aceitacao: pelo motivo certo`,
  `aguardando aceitacao: aponta o /finalizar-bloco`,
  `recusa 2, estado.md existente: nenhuma branch criada` e
  `recusa 2, estado.md existente: a arvore foi criada`;
- `lane-aceitar.tests.sh: ok=54 falha=35`; no trecho inteiro dele, as `FALHA` mostram
  `PORTAO RECUSOU: verbo 'aceitar' desconhecido; use descobrir, abrir, conferir ou fechar`;
- `FALHOU: 43 asercao(oes)`.

- [ ] **Step 5: `lane.sh`** — cinco edições: o cabeçalho; o `branches_sem_arvore` extraído do
  `descobrir`, com o `aguardando_aceitacao` logo depois; a recusa nova do `abrir`; o
  `reabrir_estado` e o `verbo_aceitar` logo depois do `verbo_abrir`; e o `case` dos verbos.

Edição 1 de 5 — troque:

```bash
# Descobre, abre, confere e fecha lanes do harness de blocos
# (spec 2026-09-26-harness-paridade-eladecora-design.md, §3.2 e §4.1).
#
```

por:

```bash
# Descobre, abre, confere e fecha lanes do harness de blocos
# (spec 2026-09-26-harness-paridade-eladecora-design.md, §3.2 e §4.1), e
# abre a lane de aceitacao de um bloco que mesclou esperando a prova do
# efeito externo (spec do bloco 36, 2.3).
#
```

Edição 2 de 5 — troque:

```bash
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
```

por:

```bash
  done
  while IFS=$SEP read -r nn ref; do
    emitir sem-arvore "$nn" "$ref"
  done < <(branches_sem_arvore)
}

branches_sem_arvore() {
  # NN<US>branch por branch de lane sem worktree: a assinatura de fechamento
  # interrompido. A do main tree entra na lista de "tem worktree" como
  # qualquer outra.
  local ref nn
  while IFS= read -r ref; do
    [[ $ref =~ $PADRAO_LANE ]] || continue
    nn=$((10#${BASH_REMATCH[2]}))
    printf '%s\n' "${ARV_BRANCH[@]}" | grep -qxF -- "$ref" && continue
    emitir "$nn" "$ref"
  done < <(git -C "$RAIZ" for-each-ref --format='%(refname:short)' refs/heads/)
}

aguardando_aceitacao() {
  # $1 = estado.md. Sai 0 quando ele esta em blocked aguardando aceitacao, o
  # que o 6a do /finalizar-bloco grava para `sim` sem prova.
  local ws resume blocker
  IFS=$SEP read -r ws resume blocker < <(python3 "$LER_FM" "$1" workflow_state resume_state blocker)
  [[ $ws == blocked && $resume == ready_for_closure && $blocker == 'aguardando aceitação'* ]]
}
```

Edição 3 de 5 — troque:

```bash
  # 2. a ficha existe e o slug e o dela
  local ficha slug_ficha deps
  ficha=$(python3 "$BACKLOG_PY" ficha "$backlog" "$nn")
  [[ -n $ficha ]] || recusar "a ficha $nn nao existe no backlog.md"
  IFS=$SEP read -r slug_ficha deps <<<"$ficha"
  [[ $slug_ficha == "$slug" ]] \
    || recusar "o slug '$slug' nao bate com o da ficha $nn ('$slug_ficha')"
```

por:

```bash
  # 2. a ficha existe e o slug e o dela
  local ficha slug_ficha deps
  ficha=$(python3 "$BACKLOG_PY" ficha "$backlog" "$nn")
  [[ -n $ficha ]] || recusar "a ficha $nn nao existe no backlog.md"
  IFS=$SEP read -r slug_ficha deps <<<"$ficha"
  [[ $slug_ficha == "$slug" ]] \
    || recusar "o slug '$slug' nao bate com o da ficha $nn ('$slug_ficha')"
  # ... e o bloco nunca passou por lane: abrir de novo sobrescreveria o
  # estado.md dele.
  local e
  for e in "$RAIZ"/docs/superpowers/blocos/"$nn"-*/estado.md; do
    [[ -f $e ]] || continue
    aguardando_aceitacao "$e" \
      && recusar "o bloco $nn ja passou por lane e espera aceitacao em blocked ($e): o caminho e /finalizar-bloco $nn"
    recusar "o bloco $nn ja passou por lane: $e existe, e abrir de novo o sobrescreveria"
  done
```

Edição 4 de 5 — troque:

```bash
  local http db mail minio console vite
  read -r http db mail minio console vite <<<"$(portas_do_offset "$offset")"
  printf 'LANE ABERTA: %s em %s\n' "$branch" "$arvore"
  printf '  portas: HTTP %s, DB %s, Mailpit %s, MinIO %s/%s, Vite %s\n' \
    "$http" "$db" "$mail" "$minio" "$console" "$vite"
  printf '  proximo passo, quando o bloco precisar do stack: (cd %s && docker compose up -d)\n' "$arvore"
}
```

por:

```bash
  local http db mail minio console vite
  read -r http db mail minio console vite <<<"$(portas_do_offset "$offset")"
  printf 'LANE ABERTA: %s em %s\n' "$branch" "$arvore"
  printf '  portas: HTTP %s, DB %s, Mailpit %s, MinIO %s/%s, Vite %s\n' \
    "$http" "$db" "$mail" "$minio" "$console" "$vite"
  printf '  proximo passo, quando o bloco precisar do stack: (cd %s && docker compose up -d)\n' "$arvore"
}

reabrir_estado() {
  # $1 estado.md na arvore nova, $2 branch, $3 pasta (NN-slug), $4 offset,
  # $5 SHA da main, $6 alias do modelo, $7 branch do bloco. Reescreve so os
  # campos da lane e da etapa (spec do bloco 36, 2.3) e confere que todos
  # sairam: um campo ausente no frontmatter nao vira lane incoerente calada.
  local agora quem c
  agora=$(date -Iseconds)
  quem="$(id -un)@$(hostname -s) / $6"
  local -a campos=(
    'workflow_state: ready_for_closure'
    'next_owner: claude'
    'next_action: close_active_work_item aceitacao externa'
    'resume_state: null'
    'blocker: null'
    "branch: $2"
    "worktree: ../lotus-$3"
    "offset: $4"
    "lane_base: $5"
    "commit: $5"
    "updated_at: $agora"
    "updated_by: $quem"
  ) sed_args=()
  for c in "${campos[@]}"; do
    sed_args+=(-e "2,/^---\$/ s|^${c%%:*}:.*|$c|")
  done
  sed -i -E "${sed_args[@]}" "$1" || return 1
  printf '\nReaberto em %s pelo lane.sh aceitar, na branch %s; a branch do bloco era %s.\n' \
    "$(date +%F)" "$2" "${7:-desconhecida}" >> "$1" || return 1
  [[ $(python3 "$LER_FM" "$1" workflow_state next_owner next_action resume_state blocker \
        branch worktree offset lane_base commit updated_at updated_by) \
     == "$(emitir ready_for_closure claude 'close_active_work_item aceitacao externa' '' '' \
        "$2" "../lotus-$3" "$4" "$5" "$5" "$agora" "$quem")" ]]
}

verbo_aceitar() {
  local nn=${1:-} modelo=terminal
  if (( $# == 3 )) && [[ $2 == --modelo ]]; then
    modelo=$3
  elif (( $# != 1 )); then
    recusar "uso: lane.sh aceitar <NN> [--modelo <alias>]"
  fi
  [[ $nn =~ $PADRAO_NN ]] || recusar "NN '$nn' nao e numero de ficha"
  [[ $modelo =~ $PADRAO_ALIAS ]] || recusar "alias de modelo '$modelo' fora de $PADRAO_ALIAS"

  raiz_ou_recusa
  # 1. main tree, na main
  exigir_main_tree aceitar
  [[ -f $RAIZ/.env.example ]] || recusar "sem .env.example na raiz, de onde sai o .env da lane"

  # 2. a pasta unica do bloco tem, como a main o versiona, o estado.md em
  # blocked aguardando aceitacao
  local -a estados=()
  local e
  for e in "$RAIZ"/docs/superpowers/blocos/"$nn"-*/estado.md; do
    [[ -f $e ]] && estados+=("$e")
  done
  (( ${#estados[@]} == 1 )) \
    || recusar "o bloco $nn precisa de uma pasta docs/superpowers/blocos/$nn-*/ com estado.md, e ha ${#estados[@]}"
  local pasta rel
  pasta=$(basename "$(dirname "${estados[0]}")")
  rel="docs/superpowers/blocos/$pasta/estado.md"
  [[ ${pasta#*-} =~ $PADRAO_SLUG ]] || recusar "a pasta $pasta nao casa <NN>-<slug>"
  { git -C "$RAIZ" ls-files --error-unmatch -- "$rel" && git -C "$RAIZ" diff --quiet HEAD -- "$rel"; } \
    >/dev/null 2>&1 || recusar "o $rel do main tree nao e o da main (nao versionado ou com mudanca local)"
  aguardando_aceitacao "${estados[0]}" \
    || recusar "o bloco $nn nao esta em blocked aguardando aceitacao: $rel diz workflow_state $(python3 "$LER_FM" "${estados[0]}" workflow_state)"

  # 3. nenhuma lane viva com o numero e nenhuma branch dele sem worktree
  local -a nums=() branches=()
  local n c b
  while IFS=$SEP read -r n c b; do
    [[ $n == "$nn" ]] && recusar "a ficha $nn ja tem lane viva: $b em $c"
    nums+=("$n")
    branches+=("$b")
  done < <(lanes_vivas)
  while IFS=$SEP read -r n b; do
    [[ $n == "$nn" ]] \
      && recusar "a branch $b do bloco $nn existe sem worktree, de um fechamento interrompido: /finalizar-bloco $nn no modo conserto"
  done < <(branches_sem_arvore)

  # 4. teto de lanes: a de aceitacao conta
  (( ${#nums[@]} < TETO_LANES )) || recusar "ja ha $TETO_LANES lanes vivas: ${branches[*]}"

  # 5. sem portao de dependencia: o codigo do bloco ja esta na main, e a lane
  # so toca a pasta dele, o backlog.md e o historico/.

  # 6. branch nova: com o nome da branch do bloco, o gh pr view acharia a PR
  # antiga, ja mesclada. A checagem da branch e defesa: o portao 3 ja pega
  # toda branch de lane com o numero.
  local br_antiga tipo=docs branch arvore
  br_antiga=$(python3 "$LER_FM" "${estados[0]}" branch)
  [[ $br_antiga == "docs/$pasta" ]] && tipo=chore
  branch="$tipo/$pasta"
  arvore="$(dirname "$PRINCIPAL")/lotus-$pasta"
  ! git -C "$RAIZ" show-ref --verify --quiet "refs/heads/$branch" \
    || recusar "a branch $branch ja existe"
  [[ ! -e $arvore ]] || recusar "o caminho $arvore ja existe"

  # 7. offset livre de 1 a 3
  local offset
  offset=$(offset_livre) || recusar "nenhum offset livre de 1 a 3: $(descrever_offsets)"

  printf 'PORTAO OK: %s pode abrir em %s, offset +%s\n' "$branch" "$arvore" "$offset"

  # Sem pnpm install e sem copiar backend/.env e frontend/.env: a lane de
  # aceitacao nao sobe stack nem toca codigo.
  local base
  base=$(git -C "$RAIZ" rev-parse --short main)
  CRIADO=()
  git -C "$RAIZ" worktree add -q -b "$branch" "$arvore" main \
    || falhar_no_meio "$nn" 'git worktree add'
  CRIADO+=("a branch $branch" "a arvore $arvore")
  escrever_env "$arvore" "$offset" || falhar_no_meio "$nn" 'o .env da raiz'
  reabrir_estado "$arvore/$rel" "$branch" "$pasta" "$offset" "$base" "$modelo" "$br_antiga" \
    || falhar_no_meio "$nn" 'a reescrita do estado.md'
  { git -C "$arvore" add "$rel" \
      && git -C "$arvore" commit -q -m "chore($nn): abre a lane de aceitação"; } \
    || falhar_no_meio "$nn" 'o commit do estado.md'
  printf 'LANE ABERTA: %s em %s\n' "$branch" "$arvore"
}
```

Edição 5 de 5 — troque:

```bash
verbo=${1:-}
(( $# > 0 )) && shift
case $verbo in
  descobrir) verbo_descobrir "$@" ;;
  abrir)     verbo_abrir "$@" ;;
  conferir)  verbo_conferir "$@" ;;
  fechar)    verbo_fechar "$@" ;;
  *) recusar "verbo '$verbo' desconhecido; use descobrir, abrir, conferir ou fechar" ;;
esac
```

por:

```bash
verbo=${1:-}
(( $# > 0 )) && shift
case $verbo in
  descobrir) verbo_descobrir "$@" ;;
  abrir)     verbo_abrir "$@" ;;
  aceitar)   verbo_aceitar "$@" ;;
  conferir)  verbo_conferir "$@" ;;
  fechar)    verbo_fechar "$@" ;;
  *) recusar "verbo '$verbo' desconhecido; use descobrir, abrir, aceitar, conferir ou fechar" ;;
esac
```

- [ ] **Step 6: Rodar e ver o verde**

```bash
bash .claude/tests/run-all.sh | awk -v a=lane-a '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: `lane-abrir.tests.sh: ok=130 falha=0`, `lane-aceitar.tests.sh: ok=89 falha=0` e
`OK: 17 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 7: Commit**

```bash
git add .claude/scripts/lane.sh .claude/tests/lane-aceitar.tests.sh .claude/tests/lane-abrir.tests.sh
git commit -m "feat(36): lane.sh aceitar abre a lane de aceitação; abrir recusa bloco que já passou por lane

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: a allowlist da `main` libera `lane.sh aceitar`

**Files:**
- Modify: `.claude/hooks/lib/classificar-comando.py`
- Modify: `.claude/tests/classificar-comando.tests.sh`

**Interfaces:**
- Consumes: no `classificar-comando.py`, `familia_lane(args)` (`args[0]` já é o script),
  `negar(motivo)`, `LANE_NN` e `LANE_ALIAS`; no teste, `assert_libera <comando>`,
  `assert_nega <comando>` e `classificar <comando>` (ecoa a negação; vazio libera).
- Produces: a forma `lane.sh aceitar <NN> [--modelo <alias>]` liberada na `main`, com a régua de
  argumento do `abrir`, e a negação que nomeia as cinco formas. O `aceitacao.sh` continua fora da
  allowlist: ele roda na lane.

- [ ] **Step 1: Escrever os casos novos**, no fim do bloco do `lane.sh`

Edição única — troque:

```bash
assert_nega   'bash'
assert_contem "$(classificar 'bash .claude/scripts/lane.sh fechar 31 --force')" \
```

por:

```bash
assert_nega   'bash'
# --- item 36: a quinta forma, `aceitar <NN> [--modelo <alias>]`
assert_libera 'bash .claude/scripts/lane.sh aceitar 33'
assert_libera 'bash .claude/scripts/lane.sh aceitar 33 --modelo opus'
assert_libera 'bash .claude/scripts/lane.sh aceitar 31 --modelo sonnet-5.1'
assert_nega   'bash .claude/scripts/lane.sh aceitar'
assert_nega   'bash .claude/scripts/lane.sh aceitar 033'
assert_nega   'bash .claude/scripts/lane.sh aceitar 3x'
assert_nega   'bash .claude/scripts/lane.sh aceitar 33 34'
assert_nega   'bash .claude/scripts/lane.sh aceitar 33 --modelo'
assert_nega   'bash .claude/scripts/lane.sh aceitar 33 --modelo OPUS'
assert_nega   'bash .claude/scripts/lane.sh aceitar 33 --model opus'
assert_nega   'bash .claude/scripts/lane.sh aceitar 33 --modelo opus extra'
assert_nega   'bash .claude/scripts/lane.sh aceitar 33 --force'
assert_nega   'bash .claude/scripts/lane.sh aceitar $(echo 33)'
assert_nega   'bash .claude/scripts/aceitacao.sh conferir 33'
assert_nega   'bash .claude/scripts/aceitacao.sh gerar 33'
assert_contem "$(classificar 'bash .claude/scripts/lane.sh aceitar 033')" \
              'aceitar <NN> [--modelo <alias>]' 'aceitar fora da forma nega nomeando a forma'
assert_contem "$(classificar 'bash .claude/scripts/lane.sh fechar 31 --force')" \
```

- [ ] **Step 2: Rodar e ver o vermelho certo**

```bash
bash .claude/tests/run-all.sh | awk -v a=classificar-comando. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected:
- as três primeiras `FALHA` são `libera: bash .claude/scripts/lane.sh aceitar 33`,
  `… aceitar 33 --modelo opus` e `… aceitar 31 --modelo sonnet-5.1`, cada uma com
  ``obtido:   [Bloqueado pelo harness: `lane.sh aceitar …` fora das formas liberadas na main: …]``;
- `classificar-comando.tests.sh: ok=266 falha=4` — a quarta é
  `aceitar fora da forma nega nomeando a forma`;
- `FALHOU: 4 asercao(oes)`.

- [ ] **Step 3: `classificar-comando.py`** — duas edições no `familia_lane`.

Edição 1 de 2, a docstring.

Troque:

```python
    """args[0] ja e LANE_SCRIPT. Libera so as quatro formas da spec."""
```

por:

```python
    """args[0] ja e LANE_SCRIPT. Libera so as cinco formas das specs (a do
    item 30 e o `aceitar` do item 36)."""
```

Edição 2 de 2, a forma nova antes da negação, e a negação com as cinco formas.

Troque:

```python
    negar("`lane.sh %s` fora das formas liberadas na main: `descobrir`, "
          "`conferir <NN>`, `fechar <NN>` e `abrir <NN> <tipo> <slug> "
          "[--modelo <alias>]`. `fechar --force` e do terminal do Joao."
          % " ".join(resto))
```

por:

```python
    if verbo == "aceitar" and len(params) in (1, 3) \
            and LANE_NN.fullmatch(params[0]):
        if len(params) == 1:
            return
        if params[1] == "--modelo" and LANE_ALIAS.fullmatch(params[2]):
            return
    negar("`lane.sh %s` fora das formas liberadas na main: `descobrir`, "
          "`conferir <NN>`, `fechar <NN>`, `abrir <NN> <tipo> <slug> "
          "[--modelo <alias>]` e `aceitar <NN> [--modelo <alias>]`. "
          "`fechar --force` e do terminal do Joao." % " ".join(resto))
```

- [ ] **Step 4: Rodar e ver o verde**

```bash
bash .claude/tests/run-all.sh | awk -v a=classificar-comando. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: `classificar-comando.tests.sh: ok=270 falha=0` e
`OK: 17 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/lib/classificar-comando.py .claude/tests/classificar-comando.tests.sh
git commit -m "feat(36): a allowlist da main libera lane.sh aceitar

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `aceitacao.sh conferir`

**Files:**
- Modify: `.claude/scripts/lib/aceitacao.py`
- Modify: `.claude/scripts/aceitacao.sh`
- Modify: `.claude/tests/aceitacao.tests.sh`

**Interfaces:**
- Consumes: da Task 1, as funções do `aceitacao.py` e os helpers do `aceitacao.tests.sh`, com os
  nomes e as assinaturas do Produces dela.
- Produces:
  - `bash .claude/scripts/aceitacao.sh conferir <NN>`, com o contrato do Global Constraints.
  - `python3 .claude/scripts/lib/aceitacao.py provas <spec> <alvo> <aliases> <porta> <NN>`: valida
    tudo, não escreve nada e imprime uma linha por prova automática,
    `n␟metodo␟url-base␟caminho␟esperado` (`␟` é `\x1f`).
  - `python3 .claude/scripts/lib/aceitacao.py conferir <spec> <alvo> <aliases> <porta> <NN>
    [<n>=<código>...]`: grava as medições, datadas de hoje, e imprime os avisos e o veredito.
  - No `aceitacao.py`: `data_valida(texto) -> bool`, `ler_medidas(extras, itens) -> {n: código}`
    e `conferir(itens, tabela, medidas, alvo, nn) -> int`. No `aceitacao.sh`:
    `medir <método> <url>` (ecoa o código; `000` na falha) e `verbo_conferir`.

- [ ] **Step 1: Acrescentar os testes do `conferir`** ao fim do `.claude/tests/aceitacao.tests.sh`.
  A última linha do arquivo fica, e o bloco novo vem depois dela.

Edição única — troque:

```bash
ac_recusa 'alias `teste`' 'alias fora do conf real e recusado'
```

por:

```bash
ac_recusa 'alias `teste`' 'alias fora do conf real e recusado'

# --- conferir: servidor HTTP local, so em 127.0.0.1, que morre sozinho em
# 120 s se a suite cair antes do kill do fim
_ac_www="$_ac_t/www"; mkdir -p "$_ac_www"; printf 'ok\n' > "$_ac_www/up"
timeout 120 python3 -u -m http.server 0 --bind 127.0.0.1 --directory "$_ac_www" \
  > "$_ac_t/http.log" 2>&1 &
_ac_pid=$!
_ac_porta=''
for _ac_i in $(seq 100); do
  _ac_porta=$(sed -nE 's/^Serving HTTP on 127\.0\.0\.1 port ([0-9]+) .*/\1/p' "$_ac_t/http.log")
  [[ -n $_ac_porta ]] && break
  sleep 0.05
done
if [[ $_ac_porta =~ ^[0-9]+$ ]]; then
  printf '  ok    http.server de pe em 127.0.0.1:%s\n' "$_ac_porta"
else
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA http.server nao subiu: %s\n' "$(cat "$_ac_t/http.log")"
fi
_ac_fechada=$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')
printf 'teste http://127.0.0.1:%s\nfechado http://127.0.0.1:%s\n' "$_ac_porta" "$_ac_fechada" > "$_ac_t/http.conf"
AC_ALIASES="$_ac_t/http.conf"
AC_CURL=curl

ac_novo sim "$_AC_P/spec.md"
ac_spec <<'SPEC'
## Verificação externa

1. A rota responde.
   - prova: `teste GET /up -> 200`
2. A rota responde ao HEAD.
   - prova: `teste HEAD /up -> 200`
3. O João confere.
   - prova: nenhuma
SPEC
ac_rodar gerar 50
ac_rodar conferir 50
assert_igual 1 "$AC_COD" 'manual vazio: conferir sai 1'
assert_igual 'ACEITACAO PENDENTE: 1 de 3 item(ns): 3' "$AC_ULTIMA" 'manual vazio: pendente pelo numero'
assert_contem "$AC_SAIDA" "MEDIDO 1: GET http://127.0.0.1:$_ac_porta/up -> 200, esperado 200: OK" 'GET medido contra o http.server'
assert_contem "$AC_SAIDA" "MEDIDO 2: HEAD http://127.0.0.1:$_ac_porta/up -> 200, esperado 200: OK" 'HEAD medido contra o http.server'
_ac_hoje=$(date +%F)
assert_igual "| 1 | A rota responde. | \`teste GET /up -> 200\` | \`200\`, esperado \`200\`: OK | $_ac_hoje |" \
  "$(ac_linha 1)" 'a medicao entra na tabela, datada de hoje'
ac_manual 3 'conferido no painel' ontem
ac_rodar conferir 50
assert_igual 'ACEITACAO PENDENTE: 1 de 3 item(ns): 3' "$AC_ULTIMA" 'data ontem: pendente'
sed -i 's/| ontem |/| 2026-02-30 |/' "$AC_R/$_AC_P/aceitacao.md"
ac_rodar conferir 50
assert_igual 'ACEITACAO PENDENTE: 1 de 3 item(ns): 3' "$AC_ULTIMA" 'data 2026-02-30: pendente'
sed -i 's/| 2026-02-30 |/| 2026-10-04 |/' "$AC_R/$_AC_P/aceitacao.md"
sed -i -E 's/^\| 1 \| (.*) \| (`teste GET \/up -> 200`) \| .* \| .* \|$/| 1 | \1 | \2 | forjado | 2020-01-01 |/' \
  "$AC_R/$_AC_P/aceitacao.md"
ac_rodar conferir 50
assert_igual 0 "$AC_COD" 'tudo provado: conferir sai 0'
assert_igual 'ACEITACAO OK: 3 item(ns)' "$AC_ULTIMA" 'tudo provado: OK com a contagem'
assert_igual "| 1 | A rota responde. | \`teste GET /up -> 200\` | \`200\`, esperado \`200\`: OK | $_ac_hoje |" \
  "$(ac_linha 1)" 'a automatica e remedida e sobrescreve o que foi escrito nela'
assert_igual '| 3 | O João confere. | manual | conferido no painel | 2026-10-04 |' "$(ac_linha 3)" \
  'o manual nunca e tocado'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Some.\n   - prova: teste GET /nada -> 200\n2. Fechado.\n   - prova: fechado GET /up -> 200\n' | ac_spec
ac_rodar conferir 50
assert_igual 1 "$AC_COD" '404 e porta fechada: sai 1'
assert_igual 'ACEITACAO PENDENTE: 2 de 2 item(ns): 1, 2' "$AC_ULTIMA" '404 e porta fechada: os dois pendentes'
assert_contem "$(ac_linha 1)" '`404`, esperado `200`: FALHOU' '404 e FALHOU'
assert_contem "$(ac_linha 2)" '`000`, esperado `200`: FALHOU' 'porta fechada mede 000'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\nNenhuma.\n' | ac_spec
ac_rodar conferir 50
ac_recusa 'nao tem item numerado' 'conferir com zero itens'
ac_nada_escrito 'conferir com zero itens'

kill "$_ac_pid" 2>/dev/null
wait "$_ac_pid" 2>/dev/null

# --- curl falso: argumentos exatos, URL montada e aliases reais
_ac_curl="$_ac_t/curl-falso"
cat > "$_ac_curl" <<FALSO
#!/usr/bin/env bash
printf '%s\n' "\$*" >> '$_ac_curl.log'
printf '200'
FALSO
chmod +x "$_ac_curl"
AC_CURL=$_ac_curl
AC_ALIASES="$_ac_t/aliases.conf"
ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Get.\n   - prova: teste GET /up?x=1 -> 200\n2. Head.\n   - prova: outro-alias HEAD /h -> 200\n' | ac_spec
: > "$_ac_curl.log"
ac_rodar conferir 50
assert_igual 'ACEITACAO OK: 2 item(ns)' "$AC_ULTIMA" 'curl falso: OK'
assert_igual "-q -sS -o /dev/null -w %{http_code} --max-time 30 --proto =http,https http://teste.local/up?x=1
-q -sS -o /dev/null -w %{http_code} --max-time 30 --proto =http,https -I http://outro.local:8443/h" \
  "$(cat "$_ac_curl.log")" '-q primeiro, sem -L, -H ou -u, -I so no HEAD e a URL montada'

ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Shell no caminho.\n   - prova: teste GET /x$(touch${IFS}%s) -> 200\n' "$_ac_t/pwned2" | ac_spec
: > "$_ac_curl.log"
ac_rodar conferir 50
assert_contem "$(cat "$_ac_curl.log")" 'http://teste.local/x$(touch${IFS}' 'o caminho chega ao curl como texto'
if [[ -e $_ac_t/pwned2 ]]; then
  FALHAS_TESTE=$((FALHAS_TESTE + 1)); printf '  FALHA o $(...) do caminho foi executado\n'
else
  printf '  ok    o $(...) do caminho nunca vira shell\n'
fi

AC_ALIASES=''
ac_novo sim "$_AC_P/spec.md"
printf '## Verificação externa\n\n1. Producao.\n   - prova: producao GET /up -> 200\n2. Local.\n   - prova: local GET /up -> 200\n' | ac_spec
: > "$_ac_curl.log"
ac_rodar conferir 50
assert_contem "$(cat "$_ac_curl.log")" ' https://app.lotusotec.cl/up' 'producao e https://app.lotusotec.cl'
assert_contem "$(cat "$_ac_curl.log")" ' http://localhost:8080/up' 'local sem .env cai em 8080'
printf 'LOTUS_DEV_HTTP_PORT=8081\nLOTUS_DEV_HTTP_PORT="8082"\n' > "$AC_R/.env"
: > "$_ac_curl.log"
ac_rodar conferir 50
assert_contem "$(cat "$_ac_curl.log")" ' http://localhost:8082/up' 'local le a ultima LOTUS_DEV_HTTP_PORT do .env, com aspas'

cat > "$_ac_curl" <<FALSO
#!/usr/bin/env bash
printf '200200'
FALSO
ac_rodar conferir 50
assert_igual 'ACEITACAO PENDENTE: 2 de 2 item(ns): 1, 2' "$AC_ULTIMA" 'saida que nao e um codigo mede 000'
assert_contem "$(ac_linha 1)" '`000`, esperado `200`: FALHOU' 'saida que nao e um codigo fica registrada como 000'
```

- [ ] **Step 2: Rodar e ver o vermelho certo**

```bash
bash .claude/tests/run-all.sh | awk -v a=aceitacao. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected:
- a primeira `FALHA` é `manual vazio: conferir sai 1`, com `obtido:   [2]`; a segunda mostra o
  motivo, `obtido:   [PORTAO RECUSOU: verbo 'conferir' desconhecido; use gerar]`;
- `aceitacao.tests.sh: ok=141 falha=23`;
- `FALHOU: 23 asercao(oes)`.

- [ ] **Step 3: `lib/aceitacao.py`** — quatro edições.

Edição 1 de 4, a docstring.

Troque:

```python
Uso, sempre da raiz da arvore (os caminhos sao relativos a ela):
  aceitacao.py gerar <spec> <alvo> <aliases> <porta> <NN>
      Cria ou completa <alvo>, preservando o resultado de todo item cuja
      identidade bate. stdout: um aviso por resultado descartado e, por
      ultimo, `ACEITACAO GERADA: <alvo> (<n> item(ns))`.
  <porta> e o LOTUS_DEV_HTTP_PORT que o aceitacao.sh leu do .env da raiz.

Saida: 0 gerado; 2 recusa, com `PORTAO RECUSOU: <motivo>` no stderr e nada
escrito. Excecao inesperada tambem sai 2: o exit 1 fica para o veredito
PENDENTE do `conferir`.
```

por:

```python
Uso, sempre da raiz da arvore (os caminhos sao relativos a ela):
  aceitacao.py gerar    <spec> <alvo> <aliases> <porta> <NN>
      Cria ou completa <alvo>, preservando o resultado de todo item cuja
      identidade bate. stdout: um aviso por resultado descartado e, por
      ultimo, `ACEITACAO GERADA: <alvo> (<n> item(ns))`.
  aceitacao.py provas   <spec> <alvo> <aliases> <porta> <NN>
      Valida tudo e nao escreve nada. stdout: uma linha por prova
      automatica, `n<US>metodo<US>url-base<US>caminho<US>esperado`.
  aceitacao.py conferir <spec> <alvo> <aliases> <porta> <NN> [<n>=<codigo>...]
      Grava em <alvo> a medicao de cada prova automatica, datada de hoje.
      stdout: os avisos e, na ultima linha, o veredito.
  <porta> e o LOTUS_DEV_HTTP_PORT que o aceitacao.sh leu do .env da raiz.

Saida: 0 gerado ou ACEITACAO OK; 1 ACEITACAO PENDENTE; 2 recusa, com
`PORTAO RECUSOU: <motivo>` no stderr e nada escrito. Excecao inesperada
tambem sai 2: o exit 1 e so do veredito PENDENTE.
```

Edição 2 de 4, os imports e o separador.

Troque:

```python
import traceback

TITULO = re.compile(r"^(#{1,2})\s+(.*?)\s*$")
```

por:

```python
import traceback
from datetime import date

SEP = "\x1f"
TITULO = re.compile(r"^(#{1,2})\s+(.*?)\s*$")
```

Edição 3 de 4, as expressões novas e o uso dos três verbos.

Troque:

```python
USO = "uso: aceitacao.py gerar <spec> <alvo> <aliases> <porta> <NN>"
```

por:

```python
DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MEDIDA = re.compile(r"^(\d+)=(\d{3})$")
USO = ("uso: aceitacao.py <gerar|provas|conferir> <spec> <alvo> <aliases> "
       "<porta> <NN> [<n>=<codigo>...]")
```

Edição 4 de 4: o `executar` dá lugar a `data_valida`, `ler_medidas`, `conferir` e ao `executar`
novo.

Troque:

```python
def executar(args):
    if len(args) != 6 or args[0] != "gerar":
        raise Recusa(USO)
    spec, alvo, arquivo_aliases, porta, nn = args[1:]
    itens = ler_itens(spec)
    classificar(itens, ler_aliases(arquivo_aliases, porta), arquivo_aliases)
    tabela = ler_tabela(alvo)
    valores, avisos = reaproveitar(itens, tabela, alvo)
    escrever_tabela(alvo, nn, itens, valores)
    for a in avisos:
        print(a)
    print("ACEITACAO GERADA: %s (%d item(ns))" % (alvo, len(itens)))
    return 0
```

por:

```python
def data_valida(texto):
    if not DATA.match(texto):
        return False
    try:
        date.fromisoformat(texto)
    except ValueError:
        return False
    return True


def ler_medidas(extras, itens):
    """{n: codigo} dos argumentos `<n>=<codigo>`; cada prova automatica
    medida uma vez, e nada alem delas."""
    automaticos = {it["n"] for it in itens if it["auto"]}
    medidas = {}
    for e in extras:
        m = MEDIDA.match(e)
        if not m or int(m.group(1)) not in automaticos or int(m.group(1)) in medidas:
            raise Recusa("medicao invalida: %s" % e)
        medidas[int(m.group(1))] = m.group(2)
    faltam = sorted(automaticos - set(medidas))
    if faltam:
        raise Recusa("prova automatica sem medicao: item(ns) %s" % ", ".join(map(str, faltam)))
    return medidas


def conferir(itens, tabela, medidas, alvo, nn):
    valores, avisos = reaproveitar(itens, tabela, alvo)
    hoje = date.today().isoformat()
    pendentes = []
    for it in itens:
        n = it["n"]
        if it["auto"]:
            esperado = it["auto"]["esperado"]
            ok = medidas[n] == esperado
            valores[n] = ("`%s`, esperado `%s`: %s" % (medidas[n], esperado,
                                                        "OK" if ok else "FALHOU"), hoje)
            if not ok:
                pendentes.append(n)
            continue
        resultado, data = valores.get(n, ("", ""))
        if not resultado or not data_valida(data):
            pendentes.append(n)
    escrever_tabela(alvo, nn, itens, valores)
    for a in avisos:
        print(a)
    if not pendentes:
        print("ACEITACAO OK: %d item(ns)" % len(itens))
        return 0
    print("ACEITACAO PENDENTE: %d de %d item(ns): %s"
          % (len(pendentes), len(itens), ", ".join(map(str, pendentes))))
    return 1


def executar(args):
    if len(args) < 6 or args[0] not in ("gerar", "provas", "conferir") \
            or (args[0] != "conferir" and len(args) > 6):
        raise Recusa(USO)
    verbo, spec, alvo, arquivo_aliases, porta, nn = args[:6]
    itens = ler_itens(spec)
    classificar(itens, ler_aliases(arquivo_aliases, porta), arquivo_aliases)
    tabela = ler_tabela(alvo)
    if verbo == "provas":
        for it in itens:
            a = it["auto"]
            if a:
                print(SEP.join([str(it["n"]), a["metodo"], a["base"], a["caminho"],
                                a["esperado"]]))
        return 0
    if verbo == "conferir":
        return conferir(itens, tabela, ler_medidas(args[6:], itens), alvo, nn)
    valores, avisos = reaproveitar(itens, tabela, alvo)
    escrever_tabela(alvo, nn, itens, valores)
    for a in avisos:
        print(a)
    print("ACEITACAO GERADA: %s (%d item(ns))" % (alvo, len(itens)))
    return 0
```

- [ ] **Step 4: `aceitacao.sh`** — quatro edições: o cabeçalho; o `CURL`; o `medir` e o
  `verbo_conferir` antes dos argumentos, que passam a aceitar `conferir`; e o ramo `conferir` do
  `case`.

Edição 1 de 4 — troque:

```bash
#!/usr/bin/env bash
# Portao de efeito externo do /finalizar-bloco (spec do bloco 36, secao 1).
# `gerar` monta o aceitacao.md do bloco a partir da secao
# `## Verificacao externa` da spec dele. Existe como script, e nao como prosa
# no command, porque portao escrito em prosa o agente executa de cabeca e
# pula (a licao do aceitacao.ps1 do ElaDecora).
#
# Contrato: recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, com exit
# 2, antes de escrever qualquer coisa. A leitura e a escrita do markdown
# moram em lib/aceitacao.py; aqui ficam o argumento e a raiz da arvore. O
# arquivo de aliases entra por ACEITACAO_ALIASES, para a suite usar o dela.
```

por:

```bash
#!/usr/bin/env bash
# Portao de efeito externo do /finalizar-bloco (spec do bloco 36, secao 1).
# `gerar` monta o aceitacao.md do bloco a partir da secao
# `## Verificacao externa` da spec dele; `conferir` mede as provas
# automaticas, grava o resultado e da o veredito na ultima linha. Existe
# como script, e nao como prosa no command, porque portao escrito em prosa o
# agente executa de cabeca e pula (a licao do aceitacao.ps1 do ElaDecora).
#
# Contrato: recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, com exit
# 2, antes de escrever qualquer coisa; o exit 1 e so do veredito PENDENTE. A
# leitura e a escrita do markdown moram em lib/aceitacao.py; aqui ficam o
# argumento, a raiz da arvore e a chamada HTTP. `curl` entra por
# ACEITACAO_CURL e o arquivo de aliases por ACEITACAO_ALIASES, para a suite
# nao sair para a rede externa.
```

Edição 2 de 4 — troque:

```bash
LER_FM="$DIR/../hooks/lib/ler-frontmatter.py"
ACEITACAO_PY="$DIR/lib/aceitacao.py"
ALIASES=${ACEITACAO_ALIASES:-$DIR/../aceitacao-aliases.conf}
PADRAO_NN='^[1-9][0-9]*$'
# Unit Separator (0x1F), nao TAB: ver o docstring do ler-frontmatter.py.
SEP=$'\x1f'
```

por:

```bash
LER_FM="$DIR/../hooks/lib/ler-frontmatter.py"
ACEITACAO_PY="$DIR/lib/aceitacao.py"
ALIASES=${ACEITACAO_ALIASES:-$DIR/../aceitacao-aliases.conf}
CURL=${ACEITACAO_CURL:-curl}
PADRAO_NN='^[1-9][0-9]*$'
# Unit Separator (0x1F), nao TAB: ver o docstring do ler-frontmatter.py.
SEP=$'\x1f'
```

Edição 3 de 4 — troque:

```bash
(( $# == 2 )) || recusar 'uso: aceitacao.sh gerar <NN>'
VERBO=$1
NN=$2
[[ $VERBO == gerar ]] || recusar "verbo '$VERBO' desconhecido; use gerar"
[[ $NN =~ $PADRAO_NN ]] || recusar "NN '$NN' nao e numero de ficha"
```

por:

```bash
medir() {
  # $1 = metodo, $2 = URL. Ecoa o codigo HTTP; falha de rede, ou saida que
  # nao e um codigo, mede 000. Sem -L, sem cabecalho e sem credencial; o -q
  # vem primeiro para o ~/.curlrc nao entrar.
  local -a args=(-q -sS -o /dev/null -w '%{http_code}' --max-time 30 --proto '=http,https')
  [[ $1 == HEAD ]] && args+=(-I)
  local codigo
  codigo=$("$CURL" "${args[@]}" "$2")
  [[ $codigo =~ ^[0-9]{3}$ ]] || codigo=000
  printf '%s' "$codigo"
}

verbo_conferir() {
  local provas cod n metodo base caminho esperado url codigo situacao
  local -a medidas=()
  provas=$(python3 "$ACEITACAO_PY" provas "$SPEC" "$ALVO" "$ALIASES" "$PORTA" "$NN")
  cod=$?
  (( cod == 0 )) || { (( cod == 2 )) || recusar "lib/aceitacao.py saiu $cod"; exit 2; }
  while IFS=$SEP read -r n metodo base caminho esperado; do
    [[ -n $n ]] || continue
    # A ancora de / de novo, aqui, antes da chamada: sem ela, `@evil.example/x`
    # colado na URL do alias vira userinfo e troca o host.
    [[ $caminho == /* ]] || recusar "o caminho da prova do item $n nao comeca em /: $caminho"
    url=$base$caminho
    codigo=$(medir "$metodo" "$url")
    situacao=FALHOU
    [[ $codigo == "$esperado" ]] && situacao=OK
    printf 'MEDIDO %s: %s %s -> %s, esperado %s: %s\n' "$n" "$metodo" "$url" "$codigo" "$esperado" "$situacao"
    medidas+=("$n=$codigo")
  done <<<"$provas"
  python3 "$ACEITACAO_PY" conferir "$SPEC" "$ALVO" "$ALIASES" "$PORTA" "$NN" "${medidas[@]}"
  cod=$?
  (( cod <= 2 )) || recusar "lib/aceitacao.py saiu $cod"
  exit "$cod"
}

(( $# == 2 )) || recusar 'uso: aceitacao.sh <gerar|conferir> <NN>'
VERBO=$1
NN=$2
[[ $VERBO == gerar || $VERBO == conferir ]] \
  || recusar "verbo '$VERBO' desconhecido; use gerar ou conferir"
[[ $NN =~ $PADRAO_NN ]] || recusar "NN '$NN' nao e numero de ficha"
```

Edição 4 de 4 — troque:

```bash
case $VERBO in
  gerar)
    python3 "$ACEITACAO_PY" gerar "$SPEC" "$ALVO" "$ALIASES" "$PORTA" "$NN"
    cod=$?
    (( cod == 0 || cod == 2 )) || recusar "lib/aceitacao.py saiu $cod"
    exit "$cod"
    ;;
esac
```

por:

```bash
case $VERBO in
  gerar)
    python3 "$ACEITACAO_PY" gerar "$SPEC" "$ALVO" "$ALIASES" "$PORTA" "$NN"
    cod=$?
    (( cod == 0 || cod == 2 )) || recusar "lib/aceitacao.py saiu $cod"
    exit "$cod"
    ;;
  conferir) verbo_conferir ;;
esac
```

- [ ] **Step 5: Rodar e ver o verde**

```bash
bash .claude/tests/run-all.sh | awk -v a=aceitacao. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: `aceitacao.tests.sh: ok=164 falha=0` e `OK: 17 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/lib/aceitacao.py .claude/scripts/aceitacao.sh .claude/tests/aceitacao.tests.sh
git commit -m "feat(36): aceitacao.sh conferir mede as provas e dá o veredito na última linha

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `/planejar-bloco` e `/finalizar-bloco` rodam os portões

**Files:**
- Modify: `.claude/tests/commands.tests.sh`
- Modify: `.claude/commands/planejar-bloco.md`
- Modify: `.claude/commands/finalizar-bloco.md`

**Interfaces:**
- Consumes:
  - os contratos do `aceitacao.sh` e do `lane.sh aceitar` (Global Constraints): o texto dos
    commands os cita, e nada deles roda nesta task;
  - a forma `lane.sh aceitar <NN> [--modelo <alias>]` liberada na `main` pela Task 3, que o
    Step 6 confere;
  - no `commands.tests.sh`: `cm_problemas <dir .claude>`, `cm_fixture <dir>`,
    `cm_sonda <caso> <trecho esperado> <comando...>`, `_CM_BLOCO` e `_CM_ENTRADAS`.
- Produces: `_CM_TRECHOS` (entradas `'<command>|<trecho literal>'`) e a mensagem
  `<command>: sem o trecho <trecho>`, que a Task 8 vê reprovar.

- [ ] **Step 1: A catraca das quatro linhas** — seis edições no `.claude/tests/commands.tests.sh`.

Edição 1 de 6 — troque:

```bash
_CM_ENTRADAS=(commands/revisar-frontend.md commands/revisar-ui.md skills/auditar-docs/SKILL.md skills/lotus-ui-review/SKILL.md)
```

por:

```bash
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
```

Edição 2 de 6 — troque:

```bash
  # $1 = diretorio .claude (o que contem commands/, agents/, skills/...)
  local c=$1 nome arq s model effort dmi tab ag
  local -a spec
```

por:

```bash
  # $1 = diretorio .claude (o que contem commands/, agents/, skills/...)
  local c=$1 nome arq s model effort dmi tab ag par
  local -a spec
```

Edição 3 de 6 — troque:

```bash
    done
  done
```

por:

```bash
    done
  done
  for par in "${_CM_TRECHOS[@]}"; do
    arq="$c/commands/${par%%|*}.md"
    [[ -f $arq ]] || continue   # a ausencia ja saiu como "command ausente"
    grep -qF -- "${par#*|}" "$arq" || printf '%s: sem o trecho %s\n' "${par%%|*}" "${par#*|}"
  done
```

Edição 4 de 6 — troque:

```bash
  # Arvore .claude minima e valida, para as sondas estragarem.
  local c=$1 nome s arq
  local -a spec
```

por:

```bash
  # Arvore .claude minima e valida, para as sondas estragarem.
  local c=$1 nome s arq par
  local -a spec
```

Edição 5 de 6 — troque:

```bash
      for s in "${spec[@]:2}"; do printf 'Invoque `Skill(%s)`.\n' "$s"; done
    } > "$c/commands/$nome.md"
```

por:

```bash
      for s in "${spec[@]:2}"; do printf 'Invoque `Skill(%s)`.\n' "$s"; done
      for par in "${_CM_TRECHOS[@]}"; do
        [[ ${par%%|*} == "$nome" ]] && printf '%s\n' "${par#*|}"
      done
    } > "$c/commands/$nome.md"
```

Edição 6 de 6 — troque:

```bash
  mkdir -p skills/revisar-sprint
```

por:

```bash
  mkdir -p skills/revisar-sprint
cm_sonda sem-gerar 'planejar-bloco: sem o trecho bash .claude/scripts/aceitacao.sh gerar' \
  sed -i '/aceitacao.sh gerar/d' commands/planejar-bloco.md
cm_sonda sem-conferir 'finalizar-bloco: sem o trecho bash .claude/scripts/aceitacao.sh conferir' \
  sed -i '/aceitacao.sh conferir/d' commands/finalizar-bloco.md
cm_sonda sem-aceitar 'finalizar-bloco: sem o trecho bash .claude/scripts/lane.sh aceitar' \
  sed -i '/lane.sh aceitar/d' commands/finalizar-bloco.md
cm_sonda sem-rede 'finalizar-bloco: sem o trecho grep -E' \
  sed -i '/docker-compose/d' commands/finalizar-bloco.md
```

- [ ] **Step 2: Rodar e ver o vermelho certo**

```bash
bash .claude/tests/run-all.sh | awk -v a=commands. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected:
- uma `FALHA` só, `o .claude/ real passa na catraca dos commands`, com
  `obtido:   [planejar-bloco: sem o trecho bash .claude/scripts/aceitacao.sh gerar`; no trecho
  inteiro do arquivo, o `obtido` segue com `finalizar-bloco: sem o trecho` de
  `bash .claude/scripts/aceitacao.sh conferir`, de `bash .claude/scripts/lane.sh aceitar` e do
  `grep -E` da rede de segurança. As quatro sondas novas passam: a fixture já traz os trechos;
- `commands.tests.sh: ok=21 falha=1`;
- `FALHOU: 1 asercao(oes)`.

- [ ] **Step 3: `/planejar-bloco`** — quatro edições: a frase da tabela `## Aguardando
  aceitação` no presente (Passo 3), o formato da prova (Passo 7), o `active_acceptance` e o
  `aceitacao.sh gerar` (Passo 9).

Edição 1 de 4 — troque:

```markdown
- `NN` → leia a seção `## <NN>. \`<slug>\`` de `docs/superpowers/backlog.md`. Ausente → pare.
  Ficha cuja pasta `docs/superpowers/blocos/<NN>-<slug>/` já tem `estado.md` na `main` → pare: o
  bloco já passou por uma lane, e abrir outra sobrescreveria o estado dele. Em `blocked` aguardando
  aceitação (o 6a do `/finalizar-bloco` deixa a ficha no backlog até o `closed`), o que falta é
  prova, e o command certo é `/finalizar-bloco <NN>`. O item 36 acrescenta a tabela
  `## Aguardando aceitação` ao `backlog.md`; ficha sob ela também para.
```

por:

```markdown
- `NN` → leia a seção `## <NN>. \`<slug>\`` de `docs/superpowers/backlog.md`. Ausente → pare.
  Ficha cuja pasta `docs/superpowers/blocos/<NN>-<slug>/` já tem `estado.md` na `main` → pare: o
  bloco já passou por uma lane, e abrir outra sobrescreveria o estado dele (o `lane.sh abrir`
  também recusa). Em `blocked` aguardando aceitação (o 6a do `/finalizar-bloco` deixa a ficha no
  backlog até o `closed`), o que falta é prova, e o command certo é `/finalizar-bloco <NN>`. Ficha
  listada na tabela `## Aguardando aceitação` do `backlog.md` também para.
```

Edição 2 de 4 — troque:

```markdown
A prova é declarativa, no formato `<alias> <GET|HEAD> <caminho> -> <código>`, com os aliases do
Lotus `producao` e `local`. Até o item 36 mesclar não há `aceitacao.sh` para executá-la: a prova
fica só registrada. Item cuja verificação não tem superfície HTTP declara `prova: nenhuma`.
```

por:

```markdown
A prova é declarativa, no formato `<alias> <GET|HEAD> <caminho> -> <código>`, com o caminho
começando em `/` e um alias de `.claude/aceitacao-aliases.conf` (`producao` ou `local`). Item cuja
verificação não tem superfície HTTP declara `prova: nenhuma`. Cada item tem exatamente uma linha
`- prova:`, e o `aceitacao.sh gerar` do Passo 9 recusa a seção que foge disso.
```

Edição 3 de 4 — troque:

````markdown
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
````

por:

````markdown
```yaml
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
active_spec: docs/superpowers/blocos/<NN>-<slug>/spec.md
active_plan: docs/superpowers/blocos/<NN>-<slug>/plano.md
context_packet: docs/superpowers/blocos/<NN>-<slug>/context.md  # null quando Contexto: não
efeito_externo: <sim|nao>
executor: <claude|codex>
active_acceptance: docs/superpowers/blocos/<NN>-<slug>/aceitacao.md  # null com efeito_externo: nao
commit: <git rev-parse --short HEAD antes do commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
````

Edição 4 de 4 — troque:

```markdown
- `active_acceptance` fica `null` até o item 36 trazer o `aceitacao.md`.
```

por:

````markdown
- Com `sim`, depois de gravar o `estado.md` e antes do commit, gere a tabela de aceitação do bloco:

  ```bash
  bash .claude/scripts/aceitacao.sh gerar <NN>
  ```

  `PORTAO RECUSOU` → corrija a `## Verificação externa` da spec, como o motivo diz, e rode de novo;
  a spec corrigida entra no mesmo commit. O `aceitacao.md` gerado entra no commit do plano. Com
  `nao` não há tabela, e `active_acceptance` fica `null`.
````

- [ ] **Step 4: `/finalizar-bloco`** — treze edições: o cabeçalho; os cinco modos e a lane de
  aceitação (Passo 2); o modo Aceitação pelo `lane.sh aceitar`; o Passo 3 pulado na lane de
  aceitação; o 6a com a rede de segurança e o `conferir`; os itens c a f nos dois fechamentos da
  aceitação; e a saída do Passo 8.

Edição 1 de 13 — troque:

```markdown
Fase 4 de 4 do harness de blocos. Desenho: spec compartilhada
`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md` §5.6, com as emendas da
spec do bloco 35 — em especial a E8, que reescreve o Passo 6 e a invariante 10 para este command.
```

por:

```markdown
Fase 4 de 4 do harness de blocos. Desenho: spec compartilhada
`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md` §5.6, com as emendas da
spec do bloco 35 — em especial a E8, que reescreve o Passo 6 e a invariante 10 para este command —
e a aceitação externa da spec do bloco 36 (§2.2 a §2.5).
```

Edição 2 de 13 — troque:

```markdown
Este command tem quatro modos que já existem, mais um quinto que só o item 36 implementa. O
primeiro que casar vence — não escolha por conveniência, escolha pela assinatura em disco:
```

por:

```markdown
Este command tem cinco modos. O primeiro que casar vence — não escolha por conveniência, escolha
pela assinatura em disco:
```

Edição 3 de 13 — troque:

```markdown
- **Normal.** A branch atual casa `^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$` — a
  sessão está numa lane, nunca no main tree. O `<NN>` vem da branch, nunca do argumento; se o
  argumento trouxer um `NN` diferente, pare — invariante 7. A pasta do bloco é a branch sem o
  `<tipo>/`: `docs/superpowers/blocos/<NN>-<slug>/`. Leia o `estado.md` de lá: o `branch` gravado
  precisa bater com a branch atual — divergindo, é `estado.md` desatualizado, e a invariante 7
  manda parar, não consertar. Com `workflow_state: ready_for_closure`, siga o fluxo normal. Com
  `closed` — ou com `blocked` **aguardando aceitação**, que é o que o 6a grava para `sim` sem prova
  (`resume_state: ready_for_closure` e `blocker` começando por `aguardando aceitação`) —, o Passo 6
  já rodou nesta lane e a sessão parou antes de o Passo 7 publicar (ou a PR voltou `CLOSED`): é a
  **retomada**, logo abaixo. Qualquer outro estado — `blocked` por outro motivo, inclusive — cai no
  ramo **Nada casa**.
```

por:

```markdown
- **Normal.** A branch atual casa `^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$` — a
  sessão está numa lane, nunca no main tree. O `<NN>` vem da branch, nunca do argumento; se o
  argumento trouxer um `NN` diferente, pare — invariante 7. A pasta do bloco é a branch sem o
  `<tipo>/`: `docs/superpowers/blocos/<NN>-<slug>/`. Leia o `estado.md` de lá: o `branch` gravado
  precisa bater com a branch atual — divergindo, é `estado.md` desatualizado, e a invariante 7
  manda parar, não consertar. Com `workflow_state: ready_for_closure`, siga o fluxo normal. Com
  `closed` — ou com `blocked` **aguardando aceitação**, que é o que o 6a grava para `sim` sem prova
  (`resume_state: ready_for_closure` e `blocker` começando por `aguardando aceitação`) —, o Passo 6
  já rodou nesta lane e a sessão parou antes de o Passo 7 publicar (ou a PR voltou `CLOSED`): é a
  **retomada**, logo abaixo. Qualquer outro estado — `blocked` por outro motivo, inclusive — cai no
  ramo **Nada casa**.

  **Lane de aceitação.** É a lane que o modo Aceitação abre pelo `lane.sh aceitar`. A assinatura
  dela é `next_action: close_active_work_item aceitacao externa`, texto que só o `aceitar`
  escreve. Ela corre no modo Normal, com as diferenças marcadas no Passo 3 e nos itens a a f do
  Passo 6.
```

Edição 4 de 13 — troque:

```markdown
- **Aceitação.** No main tree, o `NN` do argumento não aparece nem como `lane␟NN␟…` nem como
  `sem-arvore␟NN␟…` no `descobrir`, e `docs/superpowers/blocos/<NN>-<slug>/estado.md` — já
  mesclado na `main` — diz `workflow_state: blocked`, esperando prova de efeito externo depois do
  merge (o que o 6a gravou). Esse é o modo que o item 36 implementa por inteiro; aqui, pare e diga:
  "o modo aceitação chega com o item 36". Até lá, a saída é do João, numa PR de docs
  (`docs/superpowers/state.md`, "Entrar e sair de `blocked`" e invariante 10), com tudo num commit
  só:

  - a prova escrita no corpo do `estado.md`, abaixo do frontmatter (invariante 11);
  - o frontmatter direto de `blocked` para `closed` — o `resume_state` já está cumprido: a revisão
    passou e a prova era o que faltava:

    ```yaml
    workflow_state: closed
    next_owner: joao
    next_action: none
    blocker: null
    resume_state: null
    commit: <git rev-parse --short HEAD antes deste commit>
    updated_at: <date -Iseconds>
    updated_by: <id -un>@<hostname -s> / <alias do modelo, ou terminal>
    ```

  - a remoção da ficha e dos `D-*` pagos, como o 6d descreve;
  - a linha do `historico/progress.md` atualizada, sem linha nova.
```

por:

````markdown
- **Aceitação.** No main tree, o `NN` do argumento não aparece nem como `lane␟NN␟…` nem como
  `sem-arvore␟NN␟…` no `descobrir`, e `docs/superpowers/blocos/<NN>-<slug>/estado.md` — já
  mesclado na `main` — está em `blocked` aguardando aceitação: `resume_state: ready_for_closure` e
  `blocker` começando por `aguardando aceitação`, o que o 6a gravou. O main tree não publica
  commit (E8), então a prova se confere numa **lane de aceitação**, aberta a partir da `main`
  atual:

  ```bash
  git fetch origin
  git merge --ff-only origin/main
  bash .claude/scripts/lane.sh aceitar <NN> --modelo <alias do modelo da sessão>
  ```

  O `merge --ff-only` falhando, ou `PORTAO RECUSOU` → pare e relate. Deu certo:
  `EnterWorktree(path: "<caminho absoluto impresso pelo LANE ABERTA>")` e siga **nesta mesma
  sessão** pelo modo **Normal**, relendo a branch atual e o `estado.md` da lane — o `aceitar` o
  deixou em `ready_for_closure`, com a assinatura da lane de aceitação.
````

Edição 5 de 13 — troque:

```markdown
**Normal segue para o Passo 3 — ou, com `closed` e algo por publicar, para o Passo 7. Pós-PR, com o merge-base já confirmado, pula direto para o
Passo 8. Conserto e Aceitação terminam aqui mesmo, nos dois ramos acima.**

## Passo 3 — Verificação com evidência fresca

Só no modo normal.
```

por:

```markdown
**Normal segue para o Passo 3 — ou, com `closed` e algo por publicar, para o Passo 7. Pós-PR, com o merge-base já confirmado, pula direto para o
Passo 8. Conserto termina aqui mesmo; Aceitação segue no modo Normal, dentro da lane que abriu.**

## Passo 3 — Verificação com evidência fresca

Só no modo normal. **Na lane de aceitação, nada deste passo se aplica:** o diff dela contra a
`origin/main` é só a pasta do bloco, e a verificação é o `aceitacao.sh conferir` do 6a. Siga para
o Passo 4.
```

Edição 6 de 13 — troque:

```markdown
- `sim` → até o item 36 trazer o `aceitacao.md`, a prova do efeito externo vai escrita no corpo em
  markdown do `estado.md` (abaixo do frontmatter — invariante 11). Com a prova escrita, siga para o
  item b. Sem ela, o bloco não vai a `closed` — e não para aqui: quando a prova só existe depois do
  merge (deploy, configuração em produção, aprovação de terceiro), o fechamento segue em
  **aguardando aceitação**, com as diferenças marcadas nos itens c a f. Antes, liste os
  itens de `## Verificação externa` da spec do bloco que ainda não têm prova: são eles que vão no
  `blocker`.
- `nao` → siga para o item b.
```

por:

````markdown
- `nao` → a rede de segurança: liste o que o bloco mudou no caminho da produção.

  ```bash
  git diff --name-only $(git merge-base origin/main HEAD)..HEAD \
    | grep -E '^(deploy/|docker/Dockerfile\.prod|docker-compose\.prod|\.github/workflows/|scripts/)'
  ```

  Saiu qualquer caminho → pare e pergunte ao João se o `nao` está certo. Mudar o campo é decisão
  dele; com a resposta, refaça este item pelo valor que ficar gravado. Nada listado → siga para o
  item b.
- `sim` → o portão é o script, não esta prosa — portão em prosa o agente executa de cabeça e pula:

  ```bash
  bash .claude/scripts/aceitacao.sh conferir <NN>
  ```

  O veredito é a última linha, e o código de saída o confirma.
  - `PORTAO RECUSOU` (exit 2) → pare: a spec ou o `aceitacao.md` estão incompletos, e o motivo diz
    o quê. Bloco planejado antes do item 36 pode não ter item numerado na `## Verificação
    externa`; completar a seção é decisão do João.
  - `ACEITACAO OK: <n> item(ns)` (exit 0) → siga para o item b: o fechamento é o normal.
  - `ACEITACAO PENDENTE: <k> de <n> item(ns): <números>` (exit 1), **na lane do bloco** → o
    fechamento segue em **aguardando aceitação**, com as diferenças marcadas nos itens c a f. Os
    `<números>` são os itens pendentes.
  - `ACEITACAO PENDENTE`, **na lane de aceitação** → pare **antes** de commitar e mostre os itens
    pendentes. O João escolhe:
    - preencher `Resultado` e `Data` (`AAAA-MM-DD`) dos itens manuais no `aceitacao.md` desta
      lane — ele mesmo, ou ditando a esta sessão: o resultado é a palavra dele, nunca uma
      conclusão sua — e rodar o `conferir` de novo, nesta mesma sessão;
    - ou descartar: aqui, `git restore docs/superpowers/blocos/<NN>-<slug>/aceitacao.md`; no
      terminal dele, no main tree, `bash .claude/scripts/lane.sh fechar <NN> --force` — o commit
      do `aceitar` não está na `main`, e o `fechar` sem `--force` recusa. Nada é publicado, e o
      bloco segue em `blocked` na `main`.

  Com OK, e com PENDENTE na lane do bloco, o `aceitacao.md` entra no commit do item f.
````

Edição 7 de 13 — troque:

```markdown
**c. Histórico.** Uma linha nova em `docs/superpowers/historico/progress.md`, no formato das que
já estão lá. No máximo dez entradas recentes: o excesso desce, **verbatim**, para
`progress-archive.md`. Aguardando aceitação: a linha diz que o bloco mesclou sem a prova externa e
nomeia os itens pendentes; quem a atualiza, sem linha nova, é a PR que grava o `closed`.
```

por:

```markdown
**c. Histórico.** Uma linha nova em `docs/superpowers/historico/progress.md`, no formato das que
já estão lá. No máximo dez entradas recentes: o excesso desce, **verbatim**, para
`progress-archive.md`.
- Aguardando aceitação: a linha diz que o bloco mesclou sem a prova externa, nomeia os itens
  pendentes do `ACEITACAO PENDENTE` e nomeia os `D-*` que a verificação do Passo 3 deu como pagos.
  É dela que a lane de aceitação os tira, porque ela não refaz o Passo 3.
- Lane de aceitação: nenhuma linha nova. Atualize a linha do bloco onde ela estiver — no
  `progress.md` ou, se já desceu, no `progress-archive.md` —, registrando a aceitação e a data.
```

Edição 8 de 13 — troque:

```markdown
- a linha dela na tabela de `# Ordem de execução`, quando tiver uma — a linha cujo `Bloco` começa
  por `**<NN>**`. As outras linhas da tabela não mudam de posição nem de número.
```

por:

```markdown
- a linha dela na tabela de recomendação de `# Ordem de execução` (`| # | Bloco | Frente | Por
  que aqui |`), quando tiver uma — a linha cujo `Bloco` começa por `**<NN>**`. As outras linhas da
  tabela não mudam de posição nem de número.
```

Edição 9 de 13 — troque:

```markdown
Nenhuma outra linha do `backlog.md` muda — prosa que cita o número, inclusive (E8, E10, invariante
10 — a lane escreve a própria remoção; o main tree não publica commit nenhum na `main`, então a
única porta pela qual o `backlog.md` chega lá é esta, dentro do PR).

Aguardando aceitação: pule este item inteiro. A ficha e os `D-*` ficam no `backlog.md` até o
`closed`, e saem na mesma PR que o grava.
```

por:

```markdown
A aceitação externa muda este item nos dois fechamentos dela:

- Aguardando aceitação (lane do bloco): a ficha e os `D-*` ficam. Sai só a linha da ficha na
  tabela de recomendação de `# Ordem de execução`, quando tiver uma, e entra no fim da tabela de
  `## Aguardando aceitação` a linha
  ``| **<NN>** `<slug>` | <números do ACEITACAO PENDENTE> | <AAAA-MM-DD de hoje> |``.
- Lane de aceitação: a ficha sai como acima; os `D-*` que saem são os que a linha do bloco no
  histórico (item c) nomeia como pagos, com a prova tirada dela; e a linha do bloco sai da tabela
  de `## Aguardando aceitação`.

Fora isso, nenhuma outra linha do `backlog.md` muda — prosa que cita o número, inclusive (E8,
E10, invariante 10 — a lane escreve a própria remoção; o main tree não publica commit nenhum na
`main`, então a única porta pela qual o `backlog.md` chega lá é esta, dentro do PR).
```

Edição 10 de 13 — troque:

````markdown
Aguardando aceitação, no lugar do bloco acima (`docs/superpowers/state.md`, "Entrar e sair de
`blocked`"):

```yaml
workflow_state: blocked
resume_state: ready_for_closure
blocker: "aguardando aceitação depois do merge: <itens pendentes da ## Verificação externa>"
next_owner: joao
next_action: "resolve_blocker aguardando aceitação: <itens>"
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```
````

por:

````markdown
Com `efeito_externo: sim`, grave também
`active_acceptance: docs/superpowers/blocos/<NN>-<slug>/aceitacao.md` quando ele vier `null` —
bloco planejado antes do item 36.

Aguardando aceitação, no lugar do bloco de cima (`docs/superpowers/state.md`, "Entrar e sair de
`blocked`"):

```yaml
workflow_state: blocked
resume_state: ready_for_closure
blocker: "aguardando aceitação depois do merge: itens <números do ACEITACAO PENDENTE> da ## Verificação externa"
next_owner: joao
next_action: "resolve_blocker aguardando aceitação: itens <números>"
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

O `blocker` começa por `aguardando aceitação`: é por esse começo que o modo Aceitação e o
`lane.sh aceitar` reconhecem o bloco.
````

Edição 11 de 13 — troque:

```markdown
# mais, só quando o item tocou: docs/superpowers/historico/progress-archive.md (c) e
```

por:

```markdown
# mais, só quando o item tocou: docs/superpowers/blocos/<NN>-<slug>/aceitacao.md (a, com sim),
# docs/superpowers/historico/progress-archive.md (c) e
```

Edição 12 de 13 — troque:

```markdown
`<modelo>` é o modelo que de fato escreveu o commit (ex.: `Sonnet 5.5`). Aguardando aceitação, o
assunto é `chore(close): item <NN> aguarda aceitação`, e o `backlog.md` não entra no `git add`.
```

por:

```markdown
`<modelo>` é o modelo que de fato escreveu o commit (ex.: `Sonnet 5.5`). Aguardando aceitação, o
assunto é `chore(close): item <NN> aguarda aceitação`; na lane de aceitação,
`chore(close): item <NN> aceito`.
```

Edição 13 de 13 — troque:

```markdown
Os dois últimos comandos confirmam que a lane saiu dos dois — nem árvore, nem branch. Nada é
escrito nem commitado nesta sessão: os registros de fechamento já viajaram no commit do Passo 6, e
foi o PR que os trouxe para a `main`. Reporte o resultado. Com o bloco em `blocked` aguardando
aceitação, diga também que a lane fechou mas o bloco não: falta a prova externa, e a saída é a do
modo Aceitação (Passo 2).
```

por:

```markdown
Os dois últimos comandos confirmam que a lane saiu dos dois — nem árvore, nem branch. Nada é
escrito nem commitado nesta sessão: os registros de fechamento já viajaram no commit do Passo 6, e
foi o PR que os trouxe para a `main`. Reporte o resultado. Com o bloco em `blocked` aguardando
aceitação, diga também que a lane fechou mas o bloco não: falta a prova externa, e a saída é
`/finalizar-bloco <NN>` no main tree, que cai no modo Aceitação.
```

- [ ] **Step 5: Rodar e ver o verde**

```bash
bash .claude/tests/run-all.sh | awk -v a=commands. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: `commands.tests.sh: ok=22 falha=0` e `OK: 17 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 6: Provar que os comandos do modo Aceitação passam na allowlist da `main`**

```bash
python3 .claude/hooks/lib/classificar-comando.py 'git fetch origin'
python3 .claude/hooks/lib/classificar-comando.py 'git merge --ff-only origin/main'
python3 .claude/hooks/lib/classificar-comando.py 'bash .claude/scripts/lane.sh aceitar 33 --modelo sonnet'
```

Expected: os três não imprimem nada — vazio é liberado. Qualquer `Bloqueado pelo harness` → o
command ganhou um comando de main tree que a Task 3 não libera: pare e relate.

- [ ] **Step 7: Commit**

```bash
git add .claude/tests/commands.tests.sh .claude/commands/planejar-bloco.md .claude/commands/finalizar-bloco.md
git commit -m "feat(36): /planejar-bloco gera e /finalizar-bloco confere a aceitação; modo Aceitação pela lane

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: o contrato do estado sem a exceção da PR de docs

**Files:**
- Modify: `docs/superpowers/state.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`

**Interfaces:** nenhuma — texto. A tabela "Estados válidos" do `state.md` não muda: o
`estados.tests.sh` a compara com o `estados.sh`.

- [ ] **Step 1: Ver o que sai**

```bash
grep -n 'PR de docs que traz\|O item 36 automatiza\|que o item 36 introduz\|(item 36);' docs/superpowers/state.md CLAUDE.md AGENTS.md
```

Expected: seis linhas — `state.md` 59, 75, 120 e 125, `CLAUDE.md` 44 e `AGENTS.md` 31.

- [ ] **Step 2: `docs/superpowers/state.md`** — cinco edições: `## Lane`, "Entrar e sair de
  `blocked`" (E2), o campo `active_acceptance` e as invariantes 1, 10 e 11.

Edição 1 de 5 — troque:

```markdown
- **O main tree fica sempre na `main` e nunca é lane.** Ele planeja, abre e fecha lane
  (`lane.sh abrir` e `lane.sh fechar`) e lê o `backlog.md`. Ele não publica commit: a `main` só
  recebe PR mesclado (`CONTRIBUINDO.md`).
```

por:

```markdown
- **O main tree fica sempre na `main` e nunca é lane.** Ele planeja, abre e fecha lane
  (`lane.sh abrir`, `lane.sh aceitar` e `lane.sh fechar`) e lê o `backlog.md`. Ele não publica
  commit: a `main` só recebe PR mesclado (`CONTRIBUINDO.md`).
```

Edição 2 de 5 — troque:

```markdown
Quando um impedimento externo para o trabalho, grave `workflow_state: blocked`, `resume_state` com
o estado de onde se está saindo, `blocker` com uma linha que descreve o impedimento,
`next_owner: joao` e `next_action: resolve_blocker`, seguido do que falta. Para sair, confirme que o
`blocker` foi resolvido, copie `resume_state` de volta para `workflow_state`, zere `blocker` e
`resume_state` e troque o `next_action` pelo token do estado retomado. Nos dois sentidos vale a
invariante 9. Enquanto o bloco está em `blocked`, as regras de "a partir de" (invariantes 3, 4 e
12) usam o `resume_state` como régua. Aceitação externa pendente depois do merge também espera aqui:
o `/finalizar-bloco` (6a) grava `blocked` com `resume_state: ready_for_closure` e `blocker`
começando por `aguardando aceitação`, e a lane fecha com o bloco nesse estado. **A saída desse
`blocked` é a exceção à regra acima:** vai direto a `closed`, não ao `resume_state`, porque o
`ready_for_closure` já está cumprido — a revisão passou, e a prova era o que faltava. Ela entra numa
PR de docs, com a prova no corpo do `estado.md` e os registros da invariante 10 (`/finalizar-bloco`,
modo Aceitação). O item 36 automatiza a prova e a saída.
```

por:

```markdown
Quando um impedimento externo para o trabalho, grave `workflow_state: blocked`, `resume_state` com
o estado de onde se está saindo, `blocker` com uma linha que descreve o impedimento,
`next_owner: joao` e `next_action: resolve_blocker`, seguido do que falta. Para sair, confirme que o
`blocker` foi resolvido, copie `resume_state` de volta para `workflow_state`, zere `blocker` e
`resume_state` e troque o `next_action` pelo token do estado retomado. Nos dois sentidos vale a
invariante 9. Enquanto o bloco está em `blocked`, as regras de "a partir de" (invariantes 3, 4 e
12) usam o `resume_state` como régua. Aceitação externa pendente depois do merge também espera aqui:
o `/finalizar-bloco` (6a) grava `blocked` com `resume_state: ready_for_closure` e `blocker`
começando por `aguardando aceitação`, e a lane fecha com o bloco nesse estado. A saída segue a
regra acima, sem exceção: o modo Aceitação do `/finalizar-bloco` roda o `lane.sh aceitar`, que
abre uma **lane de aceitação** com o bloco de volta no `resume_state`. Quem confirma o `blocker`
resolvido é o `aceitacao.sh conferir` do 6a, já nessa lane: `ACEITACAO OK` leva a `closed`, e
`ACEITACAO PENDENTE` não publica nada.
```

Edição 3 de 5 — troque:

```markdown
| `active_acceptance` | caminho do `aceitacao.md` (item 36); `null` quando `efeito_externo` é `nao` |
```

por:

```markdown
| `active_acceptance` | caminho do `aceitacao.md`: o `/planejar-bloco` (Passo 9) o grava com `efeito_externo: sim`, e o 6e do `/finalizar-bloco` o preenche quando vem `null` (bloco planejado antes do item 36); `null` quando `efeito_externo` é `nao` |
```

Edição 4 de 5 — troque:

```markdown
1. **No máximo três lanes vivas.** Cada lane é um bloco, uma branch `<tipo>/<NN>-<slug>` e uma
   worktree irmã, conduzida por uma sessão própria. Abrir lane passa pelo portão do
   `lane.sh abrir`: nada de quarta lane, nada de dois blocos que dependem um do outro (pela linha
   `**Depende:**` das fichas, transitivamente, nos dois sentidos) e nada de offset repetido. O
   portão compara o offset, lido do `LOTUS_DEV_HTTP_PORT` do `.env` de cada árvore; porta avulsa
   fora da tabela do `.env.example` fica com o `docker compose up`, que falha alto. O
   `lane.sh conferir` acusa dois planos vivos que tocam os mesmos arquivos, lendo o `plano.md` da
   pasta de cada bloco; a lane que não tem um sai nomeada como `NAO CONFERIDA`.
```

por:

```markdown
1. **No máximo três lanes vivas.** Cada lane é um bloco, uma branch `<tipo>/<NN>-<slug>` e uma
   worktree irmã, conduzida por uma sessão própria. Abrir lane passa pelo portão do
   `lane.sh abrir`: nada de quarta lane, nada de dois blocos que dependem um do outro (pela linha
   `**Depende:**` das fichas, transitivamente, nos dois sentidos) e nada de offset repetido. A
   lane de aceitação, aberta pelo `lane.sh aceitar`, conta no teto e não passa pelo portão de
   dependência: o código do bloco já está na `main`, e ela só toca a pasta dele, o `backlog.md` e
   o `historico/`. O portão compara o offset, lido do `LOTUS_DEV_HTTP_PORT` do `.env` de cada
   árvore; porta avulsa fora da tabela do `.env.example` fica com o `docker compose up`, que falha
   alto. O `lane.sh conferir` acusa dois planos vivos que tocam os mesmos arquivos, lendo o
   `plano.md` da pasta de cada bloco; a lane que não tem um sai nomeada como `NAO CONFERIDA`.
```

Edição 5 de 5 — troque:

```markdown
10. **`backlog.md` entra na `main` só por PR.** Ficha nova vem numa PR de docs; a lane remove só a
    própria ficha e os débitos `D-*` que o bloco pagou (com a linha de cada um na tabela de fichas
    que saíram — E10), no commit de fechamento do `/finalizar-bloco`, junto com a linha do
    `historico/progress.md` e o `estado.md` em `closed` (spec do bloco 35, E8). Exceção: o bloco
    que mesclou em `blocked` aguardando aceitação (invariante 11) — a remoção da ficha, a linha do
    `historico/progress.md` atualizada e o `closed` entram juntos na PR de docs que traz a prova
    (E9). Nenhuma lane acrescenta nem edita ficha alheia, e é essa regra que mantém o arquivo livre
    de conflito.
11. **Bloco com `efeito_externo: sim` não vai a `closed` sem a prova do efeito externo
    registrada.** `closed` significa resultado verificado, não código na `main`. O registro é o
    `aceitacao.md` que o item 36 introduz; até ele, a prova vai no corpo do `estado.md`, no
    fechamento. Quando ela só existe depois do merge, o bloco mescla em `blocked` aguardando
    aceitação e vai a `closed` na PR que traz a prova (spec do bloco 35, E9).
```

por:

```markdown
10. **`backlog.md` entra na `main` só por PR.** Ficha nova vem numa PR de docs; a lane remove só a
    própria ficha e os débitos `D-*` que o bloco pagou (com a linha de cada um na tabela de fichas
    que saíram — E10), no commit de fechamento do `/finalizar-bloco`, junto com a linha do
    `historico/progress.md` e o `estado.md` em `closed` (spec do bloco 35, E8). O bloco que mescla
    em `blocked` aguardando aceitação (invariante 11) deixa a ficha e os `D-*` onde estão: a lane
    dele tira a linha da ficha da tabela de `# Ordem de execução` e escreve a do bloco em
    `## Aguardando aceitação`; a lane de aceitação remove depois a ficha, os `D-*` pagos e essa
    linha, no commit que grava `closed` (spec do bloco 36, §2.5). Nenhuma lane acrescenta nem
    edita ficha alheia, e é essa regra que mantém o arquivo livre de conflito.
11. **Bloco com `efeito_externo: sim` não vai a `closed` sem a prova do efeito externo
    registrada.** `closed` significa resultado verificado, não código na `main`. O registro é o
    `aceitacao.md` da pasta do bloco, e o commit que grava `closed` vem de um
    `aceitacao.sh conferir` que saiu `ACEITACAO OK`. Quando a prova só existe depois do merge, o
    bloco mescla em `blocked` aguardando aceitação e vai a `closed` pela lane de aceitação (spec do
    bloco 36, E1). Os blocos fechados antes do item 36 têm a prova em prosa no corpo do
    `estado.md`.
```

- [ ] **Step 3: `CLAUDE.md`**, §3

Edição única — troque:

```markdown
- **SÓ QUANDO O ESTADO EXIGIR:** `docs/superpowers/backlog.md` — fila futura, usada no main tree:
  para abrir lane e no planejamento, ou por solicitação explícita do João; no fechamento, é a
  lane que remove a própria ficha e os `D-*` que pagou — ou, no bloco que mesclou aguardando
  aceitação, a PR de docs que traz a prova (`state.md`, invariante 10).
```

por:

```markdown
- **SÓ QUANDO O ESTADO EXIGIR:** `docs/superpowers/backlog.md` — fila futura, usada no main tree:
  para abrir lane e no planejamento, ou por solicitação explícita do João; no fechamento, é a
  lane que remove a própria ficha e os `D-*` que pagou — ou, no bloco que mesclou aguardando
  aceitação, a lane de aceitação (`state.md`, invariante 10).
```

- [ ] **Step 4: `AGENTS.md`**

Edição única — troque:

```markdown
  Essa delegação não alcança o `historico/progress.md` nem o `backlog.md`: eles mudam só nos
  pontos da invariante 10 do `state.md` — ficha nova numa PR de docs; a remoção da própria ficha
  e dos `D-*` pagos, e a linha do `progress.md`, no fechamento do bloco, ou na PR de docs que traz
  a prova quando ele mesclou aguardando aceitação.
```

por:

```markdown
  Essa delegação não alcança o `historico/progress.md` nem o `backlog.md`: eles mudam só nos
  pontos da invariante 10 do `state.md` — ficha nova numa PR de docs; a remoção da própria ficha
  e dos `D-*` pagos, e a linha do `progress.md`, no fechamento do bloco, ou na lane de aceitação
  quando ele mesclou aguardando aceitação.
```

- [ ] **Step 5: Verificar**

```bash
grep -n 'PR de docs que traz\|O item 36 automatiza\|que o item 36 introduz\|(item 36);' docs/superpowers/state.md CLAUDE.md AGENTS.md || echo nada
grep -c 'lane de aceitação' docs/superpowers/state.md CLAUDE.md AGENTS.md
bash .claude/tests/run-all.sh | awk -v a=estados. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
```

Expected: `nada`; `docs/superpowers/state.md:4`, `CLAUDE.md:1` e `AGENTS.md:1`; `estados.tests.sh`
com `falha=0` e `OK: 17 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/state.md CLAUDE.md AGENTS.md
git commit -m "docs(36): state.md, CLAUDE.md e AGENTS.md sem a exceção da PR de docs

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: o mapa do harness e a tabela `## Aguardando aceitação`

**Files:**
- Modify: `docs/estrutura-monolito.md`
- Modify: `docs/superpowers/backlog.md`

**Interfaces:** nenhuma — texto. O `backlog.py`, portão do `lane.sh abrir`, lê o `backlog.md`: a
subseção nova não pode quebrar a leitura das fichas.

- [ ] **Step 1: `docs/estrutura-monolito.md`**, seção HARNESS — três edições: os scripts e a lib,
  a contagem de testes com o conf novo, e a régua da allowlist com a quinta forma.

Edição 1 de 3 — troque:

```markdown
│   ├── lane.sh                 # portão de toda lane — verbos `descobrir`, `abrir`, `conferir`, `fechar`
│   └── lib/backlog.py          # só leitura: fichas e conflitos de `Depende`, para o portão do `lane.sh abrir`
```

por:

```markdown
│   ├── lane.sh                 # portão de toda lane — verbos `descobrir`, `abrir`, `aceitar`, `conferir`, `fechar`
│   ├── aceitacao.sh            # portão de efeito externo: `gerar` no planejamento, `conferir` no fechamento
│   └── lib/
│       ├── backlog.py          # só leitura: fichas e conflitos de `Depende`, para o portão do `lane.sh abrir`
│       └── aceitacao.py        # lê a `## Verificação externa` da spec; lê e escreve o `aceitacao.md`
```

Edição 2 de 3 — troque:

```markdown
├── tests/                      # `run-all.sh` soma todo `*.tests.sh` da pasta (15 hoje); veredito é a
│                               #   última linha e o código de saída. Cada arquivo recusa rodar avulso
│                               #   — trava de uma linha no topo, catraca própria em `avulso.tests.sh`,
│                               #   regra descrita em `_assert.sh`. Lição 10 (`docs/README.md:70`):
│                               #   teste que nunca viu o bug reprovar é cobertura fantasma
```

por:

```markdown
├── tests/                      # `run-all.sh` soma todo `*.tests.sh` da pasta (17 hoje); veredito é a
│                               #   última linha e o código de saída. Cada arquivo recusa rodar avulso
│                               #   — trava de uma linha no topo, catraca própria em `avulso.tests.sh`,
│                               #   regra descrita em `_assert.sh`. Lição 10 (`docs/README.md:70`):
│                               #   teste que nunca viu o bug reprovar é cobertura fantasma
├── aceitacao-aliases.conf      # `<alias> <URL-base>` das provas automáticas: `producao` e `local`; sem segredo
```

Edição 3 de 3 — troque:

```markdown
- **O que ela libera na `main`:** leitura e verificação, dentro da régua de cada família — em
  `git`, os subcomandos de `GIT_SUB` (item acima); em `gh`, só `pr view/list/diff/checks`,
  `run view/list`, `repo view` e `gh api` sem verbo de escrita; e o `lane.sh` nas quatro formas
  (`descobrir`; `conferir <NN>`; `fechar <NN>`; `abrir <NN> <tipo> <slug> [--modelo <alias>]`).
```

por:

```markdown
- **O que ela libera na `main`:** leitura e verificação, dentro da régua de cada família — em
  `git`, os subcomandos de `GIT_SUB` (item acima); em `gh`, só `pr view/list/diff/checks`,
  `run view/list`, `repo view` e `gh api` sem verbo de escrita; e o `lane.sh` nas cinco formas
  (`descobrir`; `conferir <NN>`; `fechar <NN>`; `abrir <NN> <tipo> <slug> [--modelo <alias>]`;
  `aceitar <NN> [--modelo <alias>]`).
```

- [ ] **Step 2: `docs/superpowers/backlog.md`** — a subseção no fim de `# Ordem de execução`,
  antes do `---` que abre `# Fila priorizada` (spec §2.5).

Edição única — troque:

```markdown
**A colisão 16 × 9 saiu com o 16, em 2026-09-27.** O João levou a fatia 3 **inteira**, com a run de
Administración dentro, aceitando que o 9 possa redesenhar a tela depois: o relatório
`audits/2026-09-04-lotus-ui-review-administracion.md` mede a tela **atual**. Se o 9 redesenhar, a
tela nova pede run própria dentro dele.
```

por:

```markdown
**A colisão 16 × 9 saiu com o 16, em 2026-09-27.** O João levou a fatia 3 **inteira**, com a run de
Administración dentro, aceitando que o 9 possa redesenhar a tela depois: o relatório
`audits/2026-09-04-lotus-ui-review-administracion.md` mede a tela **atual**. Se o 9 redesenhar, a
tela nova pede run própria dentro dele.

## Aguardando aceitação

Bloco que mesclou em `blocked` esperando a prova do efeito externo (`state.md`, invariante 11). A
linha entra no fechamento da lane do bloco, quando o `aceitacao.sh conferir` sai PENDENTE, e sai no
fechamento da lane de aceitação, junto com a ficha (`/finalizar-bloco`, item d do Passo 6). Ficha
listada aqui não se planeja de novo: o caminho é `/finalizar-bloco <NN>` no main tree.

| Bloco | Itens pendentes | Desde |
|---|---|---|
```

- [ ] **Step 3: Verificar**

```bash
ls .claude/tests/*.tests.sh | wc -l
python3 .claude/scripts/lib/backlog.py ficha docs/superpowers/backlog.md 33 | tr '\037' '|'
python3 .claude/scripts/lib/backlog.py ficha docs/superpowers/backlog.md 36 | tr '\037' '|'
```

Expected: `17` (o número que o mapa passa a dizer), `infra-producao-email-ses|` e
`harness-aceitacao-externa|35`.

- [ ] **Step 4: Commit**

```bash
git add docs/estrutura-monolito.md docs/superpowers/backlog.md
git commit -m "docs(36): estrutura-monolito com o aceitacao.sh e o verbo aceitar; backlog com Aguardando aceitação

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: DoD 1 e 2 — suíte verde, catraca vermelha sem a linha do `conferir`

**Files:**
- Create: `docs/superpowers/blocos/36-harness-aceitacao-externa/prova-catraca.md`

**Interfaces:** nenhuma. Lê a mensagem `<command>: sem o trecho <trecho>` da Task 5.

- [ ] **Step 1: Verde**

```bash
bash .claude/tests/run-all.sh | tail -1
```

Expected: `OK: 17 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 2: Vermelho sem a linha do `conferir`, e verde de volta.** A cópia de segurança vai
  para o scratchpad da sessão; `<scratchpad>` abaixo é o caminho absoluto dele, escrito por
  extenso em cada comando — cada chamada de Bash é um shell novo, e variável não atravessa.
  Nunca `git stash`: a pilha é compartilhada entre as árvores.

```bash
cp .claude/commands/finalizar-bloco.md <scratchpad>/finalizar-bloco.md.bak
grep -c 'aceitacao.sh conferir' .claude/commands/finalizar-bloco.md
sed -i '/aceitacao.sh conferir/d' .claude/commands/finalizar-bloco.md
bash .claude/tests/run-all.sh | awk -v a=commands. '/^== /{f=(index($2,a)==1);q=$2;d=0;if(f)o[++k]=q} f&&/^  ok /{ok[q]++} f&&/^  FALHA /{fa[q]++;d=(++n<=3)?3:0} d>0{print;d--} /^(OK|FALHOU):/{z=$0} END{for(i=1;i<=k;i++)print o[i]": ok="ok[o[i]]+0" falha="fa[o[i]]+0;print z}'
cp <scratchpad>/finalizar-bloco.md.bak .claude/commands/finalizar-bloco.md
git diff --exit-code .claude/commands/finalizar-bloco.md && echo restaurado
bash .claude/tests/run-all.sh | tail -1
```

Expected:
- o `grep -c` sai `2`: a linha do Passo 3 e a do bloco de código do 6a;
- `FALHA o .claude/ real passa na catraca dos commands`, com
  `obtido:   [finalizar-bloco: sem o trecho bash .claude/scripts/aceitacao.sh conferir]`;
- `commands.tests.sh: ok=21 falha=1` e `FALHOU: 1 asercao(oes)`;
- depois do restauro, `restaurado` e `OK: 17 arquivo(s) de teste, nenhuma falha`.

- [ ] **Step 3: Registrar.** O `prova-catraca.md` traz:
  - a data e o SHA do `HEAD`;
  - os comandos dos Steps 1 e 2;
  - a saída real, recortada nas linhas do Expected.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/blocos/36-harness-aceitacao-externa/prova-catraca.md
git commit -m "test(36): suíte verde e catraca vermelha sem a linha do conferir

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: DoD 3 — o ciclo da aceitação num clone descartável

**Files:**
- Create: `docs/superpowers/blocos/36-harness-aceitacao-externa/prova-clone.md`

**Interfaces:** nenhuma. Usa a ponta da branch inteira, mesclada na `main` do clone.

> **Task com o João.** O ciclo só roda em sessões abertas no clone, e a sessão desta lane não
> escreve fora da própria worktree. O controlador entrega os comandos abaixo, o João roda o
> preparo, as sessões e o merge simulado, e o controlador lê a evidência e grava o registro. O
> `origin` do clone aponta para um repositório bare dentro do próprio `$S`: nenhum push sai da
> máquina nem toca o repositório real.

- [ ] **Step 1: Preparo**, pelo João, no terminal dele.

```bash
S=$(mktemp -d /tmp/lotus-prova-36.XXXXXX)
git clone -q /home/jvbat/projetos/lotus "$S/lotus"
git init -q --bare "$S/origin.git"
cd "$S/lotus"
git rev-parse --short origin/chore/36-harness-aceitacao-externa
git merge -q --no-ff origin/chore/36-harness-aceitacao-externa -m "prova: ponta do 36 na main do clone"
cat >> docs/superpowers/backlog.md <<'EOF'

---

## 99. `demo-aceitacao`

**Prioridade:** P3 · **Frente:** Harness · **Contexto:** não · **Depende:** —
**Fonte:** prova do DoD do item 36, só no clone descartável.

**Objetivo:** criar `docs/demo-aceitacao.md` com a linha `prova da aceitacao externa`.

**DoD:** `grep -c 'prova da aceitacao externa' docs/demo-aceitacao.md` sai `1`.
EOF
git add docs/superpowers/backlog.md
git commit -qm "prova: ficha 99 no clone"
git remote set-url origin "$S/origin.git"
git push -q origin main
git fetch -q --prune origin
git config --get core.hooksPath || echo 'sem hooksPath'
LANE_PNPM=true bash .claude/scripts/lane.sh abrir 99 chore demo-aceitacao
```

Expected: o SHA da ponta do 36 (anote: é o provado), `sem hooksPath` e
`LANE ABERTA: chore/99-demo-aceitacao em $S/lotus-99-demo-aceitacao`. Os avisos de
`backend/.env` e `frontend/.env` ausentes são esperados. **Não suba stack no clone:** o offset
dele é contado só entre as árvores do clone e colide com as lanes reais.

- [ ] **Step 2: Semear o bloco 99 em `ready_for_closure`**, pelo João, ainda no terminal.

```bash
cd "$S/lotus-99-demo-aceitacao"
P=docs/superpowers/blocos/99-demo-aceitacao
printf 'prova da aceitacao externa\n' > docs/demo-aceitacao.md
cat > "$P/spec.md" <<'EOF'
# Bloco 99 — `demo-aceitacao` (spec)

Só no clone descartável da prova do item 36.

## Verificação externa

1. A produção responde no `/up`.
   - prova: `producao GET /up -> 200`
2. O João confere que a produção abre no navegador.
   - prova: nenhuma
EOF
printf '# Bloco 99 — plano\n\nCriar `docs/demo-aceitacao.md` com a linha `prova da aceitacao externa`.\n' > "$P/plano.md"
printf '# Bloco 99 — revisão\n\n## Em aberto\n\nNenhum achado.\n' > "$P/revisao.md"
sed -i -E \
  -e 's|^workflow_state:.*|workflow_state: ready_for_closure|' \
  -e 's|^next_action:.*|next_action: close_active_work_item|' \
  -e "s|^active_spec:.*|active_spec: $P/spec.md|" \
  -e "s|^active_plan:.*|active_plan: $P/plano.md|" \
  -e "s|^active_review:.*|active_review: $P/revisao.md|" \
  -e "s|^active_acceptance:.*|active_acceptance: $P/aceitacao.md|" \
  -e 's|^efeito_externo:.*|efeito_externo: sim|' \
  -e 's|^executor:.*|executor: claude|' \
  "$P/estado.md"
bash .claude/scripts/aceitacao.sh gerar 99
git add docs/demo-aceitacao.md "$P/spec.md" "$P/plano.md" "$P/revisao.md" "$P/estado.md" "$P/aceitacao.md"
git commit -qm "prova: bloco 99 semeado em ready_for_closure"
```

Expected: `ACEITACAO GERADA: docs/superpowers/blocos/99-demo-aceitacao/aceitacao.md (2 item(ns))`.

- [ ] **Step 3: Fechamento na lane do bloco**, pelo João: em `$S/lotus-99-demo-aceitacao`,
  `claude` e depois `/finalizar-bloco 99`; aceite a instalação do plugin
  `superpowers@claude-plugins-official` se o Claude Code oferecer. Esperado:
  - Passo 3: a prova do critério é o `grep -c` do DoD da ficha, que sai `1`;
  - 6a: `MEDIDO 1: GET https://app.lotusotec.cl/up -> 200, esperado 200: OK` e, na última linha,
    `ACEITACAO PENDENTE: 1 de 2 item(ns): 2`;
  - 6c a 6e: a linha do `historico/progress.md` nomeia o item 2; a linha
    ``| **99** `demo-aceitacao` | 2 | <hoje> |`` entra em `## Aguardando aceitação`, e a ficha
    fica; o `estado.md` vai a `blocked`, com `resume_state: ready_for_closure` e
    `blocker: "aguardando aceitação depois do merge: itens 2 da ## Verificação externa"`;
  - 6f: commit `chore(close): item 99 aguarda aceitação`, com o `aceitacao.md`;
  - Passo 7: o push vai para o bare, e o `gh` falha por não haver GitHub — esperado. O João diz à
    sessão que o merge é simulado e encerra.

- [ ] **Step 4: Merge simulado**, pelo João, no main tree do clone:

```bash
cd "$S/lotus"
git fetch -q origin
git merge -q --no-ff origin/chore/99-demo-aceitacao -m "prova: merge simulado da 99"
git push -q origin main
```

- [ ] **Step 5: Pós-PR**, pelo João: em `$S/lotus`, `claude` e `/finalizar-bloco 99`. O Docker
  tem de estar de pé: o `lane.sh fechar` roda `docker compose down -v --rmi local` no projeto
  `lotus-99-demo-aceitacao`, que não tem contêiner — é no-op. Esperado: modo Pós-PR (o
  `merge-base --is-ancestor` sai `0`), `LANE FECHADA: chore/99-demo-aceitacao, …` e o aviso de
  que a lane fechou mas o bloco não: a saída é `/finalizar-bloco 99` no main tree.

- [ ] **Step 6: Aceitação**, pelo João, numa sessão nova em `$S/lotus`: `/finalizar-bloco 99`.
  Esperado, em ordem:
  1. modo Aceitação: `git fetch origin`, `git merge --ff-only origin/main` e
     `lane.sh aceitar 99 --modelo sonnet`, que termina em
     `LANE ABERTA: docs/99-demo-aceitacao em $S/lotus-99-demo-aceitacao`; depois, o
     `EnterWorktree` nela;
  2. modo Normal, na lane de aceitação: Passo 3 pulado, Passo 4 sem achado, Passo 5 sem novidade;
  3. 6a: `ACEITACAO PENDENTE: 1 de 2 item(ns): 2`, e a sessão para **antes** de commitar;
  4. o João escreve no `aceitacao.md` da lane, na linha do item 2, o que viu e a data de hoje em
     `AAAA-MM-DD` — ou dita os dois à sessão — e pede o `conferir` de novo:
     `ACEITACAO OK: 2 item(ns)`;
  5. 6c a 6f: a linha do bloco no `historico/progress.md` atualizada, sem linha nova; a ficha 99
     e a linha de `## Aguardando aceitação` saem do `backlog.md`; o `estado.md` vai a `closed`;
     commit `chore(close): item 99 aceito`, com o `aceitacao.md`;
  6. Passo 7: push no bare; o `gh` falha — esperado.

- [ ] **Step 7: Evidência.** O João grava o histórico do bare num arquivo e passa o caminho de
  `$S` ao controlador:

```bash
git -C "$S/origin.git" log --all --graph --oneline > "$S/evidencia.txt"
git -C "$S/origin.git" log --all --reverse -p --format='== %h %s' -- \
  docs/superpowers/blocos/99-demo-aceitacao/estado.md \
  docs/superpowers/blocos/99-demo-aceitacao/aceitacao.md >> "$S/evidencia.txt"
```

O controlador lê o `evidencia.txt` e os transcripts das sessões do clone:

```bash
grep -rhoE '(MEDIDO [0-9]+: [^"\\]*|ACEITACAO (OK|PENDENTE)[^"\\]*|LANE (ABERTA|FECHADA): [^"\\]*)' ~/.claude/projects/-tmp-lotus-prova-36-* | sort | uniq -c
```

Expected:
- no grafo: o merge de `chore/99-demo-aceitacao` na `main`, e a branch `docs/99-demo-aceitacao`
  com `chore(99): abre a lane de aceitação` e `chore(close): item 99 aceito`;
- no `estado.md`: `planning` → `ready_for_closure` → `blocked` aguardando aceitação →
  `ready_for_closure` com `next_action: close_active_work_item aceitacao externa` → `closed`;
- no `aceitacao.md`: nasce com `Resultado` vazio; no `aguarda`, o item 1 com
  `` `200`, esperado `200`: OK `` e o item 2 vazio; no `aceito`, o item 2 com o texto e a data
  do João;
- nos transcripts, ao menos uma vez cada: o `MEDIDO 1` de produção com `OK`,
  `ACEITACAO PENDENTE: 1 de 2 item(ns): 2`, `ACEITACAO OK: 2 item(ns)`,
  `LANE ABERTA: docs/99-demo-aceitacao …` e `LANE FECHADA: chore/99-demo-aceitacao …`.

Evidência faltando → o command não roda o portão como o plano manda: volte à Task 5 e corrija.

- [ ] **Step 8: Registrar** em `prova-clone.md`:
  - a data e o SHA da ponta do 36 provada (Step 1);
  - os comandos dos Steps 1, 2 e 4;
  - a evidência do Step 7, recortada;
  - o que o João viu de diferente do esperado.

- [ ] **Step 9: Limpar**, pelo João: `rm -rf "$S"`. As pastas de transcript em
  `~/.claude/projects` ficam. Depois, o controlador confere no repositório real:

```bash
git branch -a --list '*99*'
git ls-remote --heads origin '*99*'
```

Expected: as duas saídas vazias.

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/blocos/36-harness-aceitacao-externa/prova-clone.md
git commit -m "test(36): ciclo da aceitação externa visto rodar num clone descartável

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Depois do plano (fora das tasks)

Com o 36 em `ready_for_review`, o João abre uma sessão na lane e roda `/revisar-bloco 36` e depois
`/finalizar-bloco 36`. O bloco tem `efeito_externo: nao`, então o 6a passa pela rede de segurança
que a Task 5 escreve: o `grep` dela é ancorado em `^scripts/`, e `.claude/scripts/` não casa —
nada é listado. Nesse fechamento vai ao João o aviso da spec §6: a spec da lane 33
(`infra-producao-email-ses`, `efeito_externo: sim`) não tem `## Verificação externa`, e, com o 36
na `main`, o `conferir` do 6a dela recusa até a seção existir.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2, 3 | sim | nenhuma entre elas: o `lane.sh` não chama o `aceitacao.sh`, e a allowlist casa texto de comando |
| G2 | 4, 5 | sim | nenhuma entre elas: a 5 cita os contratos do Global Constraints, não o código da 4; o Step 6 dela lê a allowlist da Task 3, de G1 |
| G3 | 6, 7 | sim | nenhuma: texto, em arquivos distintos |

A 4 edita os mesmos três arquivos da 1, por isso vai em G2, depois de G1 inteiro. Fora de grupo,
uma a uma, no fim:
- a 8 precisa da suíte inteira verde e do `finalizar-bloco.md` da Task 5;
- a 9 precisa da ponta da branch, com as oito tasks anteriores.

Ordem: G1 (1 → 2 → 3) → G2 (4 → 5) → G3 (6 → 7) → 8 → 9.

## Handoff de execução

```yaml
executor: claude
sessao: sonnet / medium   # o frontmatter do /executar-bloco
skill: superpowers:subagent-driven-development   # 9 tasks, 19 arquivos
```

- **Despachos**, pelo `subagent_type` da tabela de `.claude/papeis.md`:
  - `implementador-integracao` (sonnet / high): Tasks 1, 2, 4, 5 e 6 — vários arquivos, e o texto
    dos commands e do contrato tem de casar com o código;
  - `implementador-mecanico` (sonnet / medium): Tasks 3, 7 e 8 — conteúdo pronto, um ou dois
    arquivos;
  - `revisor-task` em cada task; `re-revisor` e `corretor-tardio` nas rodadas de correção;
    `revisor-branch` no fim.
- **Task 9:** controlador e João, sem subagente.
- **`paths_autorizados`:** não se aplica (`executor: claude`).
- **Efeito externo:** nenhum (`efeito_externo: nao`). O `GET /up` da Task 9 é leitura de
  produção, sem credencial.
- **Stack:** não sobe. O bloco não toca `backend/` nem `frontend/`.
