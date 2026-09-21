# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

*(uma: a **`P-77`**, fechada em **2026-09-20** pelo `harness-hooks-de-guarda` (item 28). A
**`P-58`** cumpriu a sprint de rastro e saiu neste mesmo fechamento — o parágrafo do rastro adiante
é o dela.)*

> **O número `P-73` está queimado, e o `P-74` foi disputado.** O `P-73` pertenceu à advisory do
> `browserslist`. Os fechamentos do item 25 e do item 26 abriram, cada um, uma ficha que o reusou
> por engano; as duas foram renumeradas no mesmo dia — a do item 25 para **`P-74`** e as do item 26
> para **`P-75`** e **`P-76`**, nesta ordem de integração. Número de pendência não se reusa nem se
> renumera para trás: é a mesma regra que o `state.md` escreveu para o rótulo de bloco na colisão
> de 2026-09-02.

### P-77 — a spec dos hooks de guarda §9 descrevia um harness de testes que não era o entregue

**Fechada em 2026-09-20**, no fechamento do próprio bloco que a abriu (item 28), pelos dois lados do
gatilho: a spec foi corrigida **e** o harness ganhou o `trap` que ela prometia.

| O que a spec dizia | O que foi feito |
|---|---|
| §9: "`trap` limpa na saída" | `run-all.sh` ganhou `trap limpar_descartes EXIT`, e a §9 passou a descrever o mecanismo real (registro por caso + trap). **Provado nos dois sentidos:** com `TMPDIR` próprio e `timeout -s INT` no meio da suíte, **0 sobras** com o trap e **2 sobras** com a linha do trap neutralizada numa cópia |
| §9: prometia `assert_verdadeiro` | corrigida para `assert_igual`, `assert_contem` e `assert_nao_contem`, que são as três que `_assert.sh` oferece. A §9 também dizia "seis arquivos" onde há **sete** — falta[va] o `_assert.tests.sh`, que prova as próprias asserções |
| §5.2: escrevia `posix=True` | corrigida para `posix=False` + `desaspar()`, com o parágrafo que explica **por que** é deliberado: `posix=True` resolveria as aspas antes de o classificador ver o token, e `git push "--forc"e` chegaria já expandido — o escape C1 |

Duas emendas entraram junto, pelo mesmo motivo (spec descrevendo o que o código não faz): a §5.2
passou a documentar a **allowlist** de separadores de comando e a §5.3 ganhou a regra de `-C` /
`--git-dir` / `--work-tree` para fora da raiz — as duas nasceram das correções Q-1..Q-3 do review.

A §11 foi emendada no mesmo commit: ela descrevia o buraco de MCP como fechado por construção, e
o revisor verificou contra o binário instalado que o matcher de `PreToolUse` **aceita `mcp__.*`**.
O limite real é "os hooks deste bloco não cobrem MCP", não "hooks não cobrem MCP" — fechá-lo é
outro bloco. A spec arquivada está em
[`../specs/archive/2026-09-20-harness-hooks-de-guarda-design.md`](../specs/archive/2026-09-20-harness-hooks-de-guarda-design.md).

## Rastro anterior, já removido

**A P-58 saiu no fechamento do `harness-hooks-de-guarda` (2026-09-20)**, o primeiro posterior ao do
`frontend-arrumacao-de-testes` (item 27), que a encerrou em 2026-09-04 por mecanismo: o
`compose-dev.test.ts` passou a afastar os `.env*` das **duas** raízes que o `vite.config.ts` lê — a
do repositório (`loadEnv(mode, RAIZ, 'LOTUS_')`) e a de `frontend/` (`loadEnv(mode, __dirname,
'VITE_')`) —, e o gate deixou de depender do disco de quem roda, provado com o arquivo posto e
retirado duas vezes (3 falhas na versão pré-Task-7, 12/12 na nova, com o mesmo `frontend/.env` no
disco). O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**As três do `backend-envelope-de-erro-e-recusa-de-dominio` (item 26) saíram no fechamento do
`dominio-decisoes-de-rbac-e-semantica` (2026-09-04)**, o primeiro da `lane-a` posterior ao bloco que
as encerrou em 2026-09-03 — a **P-71** e a **P-72** (as recusas literais e o `detail` do 419 saindo
para `lang/` nos três locales, com o resíduo nomeado na **P-76**) e a metade de **comportamento** da
**P-60** (a validação pública do certificado com snapshot incompleto, fechada por decisão escrita); a
metade de **dado de dev** dela segue viva na **P-44**. O rastro durável está nos commits e nas linhas
de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-69, a P-68, a P-70, a P-30 e a P-42 saíram no fechamento do `frontend-arrumacao-de-testes`
(2026-09-04)**, o primeiro posterior ao do `frontend-dividas-de-mecanismo` (item 25), que as
encerrou em 2026-09-03 — e nenhuma saiu na fé: a **P-69** fechou no `setupFiles` com `cleanup()`
global mais as catracas `CLEANUP_A_MAO` e a guarda estática do `desmonte-global.test.ts`; a
**P-70**, na allowlist `DETALHE_LOCALIZADO` de 403/404/429 do `screenDetail`; a **P-30**, no
`warning` alinhado ao amarelo do `AppTag`, com régua de contraste própria (a borda que ela abriu
vive na **P-74**); a **P-68** e a **P-42**, por decisão escrita — a razão da assimetria de
`max-lines` ao lado da régua e a emenda datada ao D1 da spec arquivada da célula de identidade, as
duas sem tocar código. O rastro durável está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-73 e a P-67 saíram no fechamento do `frontend-dividas-de-mecanismo` (2026-09-03)**, o primeiro
posterior aos dos blocos que as encerraram. A **P-73** fechou em 2026-09-02 na PR #93, por bump só
de lockfile (`browserslist` 4.28.4 → 4.28.8), com `pnpm audit` de volta a **0** e o `package.json`
intacto. A **P-67** fechou em 2026-09-01 no `frontend-decisoes-de-ui-pendentes`, por mecanismo — a
escala de raio saiu da rule para catraca. **O ID `P-73` está queimado:** a ficha que este bloco abriu
nasceu numerada `P-73` por engano e foi renumerada para `P-74` no próprio fechamento, pelo mesmo
precedente de sempre — ID publicado não se reusa. O rastro durável das duas está nos commits e nas
linhas de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-61 e a P-63 saíram no fechamento do `frontend-decisoes-de-ui-pendentes` (2026-09-01)**, o
primeiro posterior aos dos dois blocos que as encerraram em 2026-08-30. A **P-61** fechou no
`hardening-i18n-e-erros-api` por mecanismo — os sete `title` do `ProblemDetails::fromException` e o
`detail` mascarado do 500 saíram do código para `lang/<locale>/problem.php` nos três locales, com o
`LocaleParityTest` recusando chave que exista em um só, e a borda que ela não cobria (o 419) vive
nomeada na [P-72](./abertas.md). A **P-63** fechou no `frontend-triagem-dos-audits-do-item-18`,
também por mecanismo — a legenda do `AppLineChart` ganhou conteúdo próprio
(`shared/ui/AppLineChart/legend.tsx`, `<ul role="list">`) e o mini-reset deixou de tirar semântica
de lista renderizada por biblioteca, medido na run 5 (`audits/2026-08-29-item19-run5.md`): zero `ul`
sem `role` no Dashboard. O rastro durável das duas está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).


**Saíram no fechamento do `hardening-acesso-ownership-e-integridade` (2026-08-23), o primeiro
posterior ao do BD-15, que é a condição que as seis linhas pediam:** a **P-18** (página de
fechamento do Notion com `Sprint` divergente), a **P-20** (`openspout/openspout` sem ADR hospedeiro,
que virou o ADR-20), a **P-21** (`simple-qrcode` sem nota no ADR-12, que virou a nota de
2026-08-22), a **P-23** (a coluna `Contexto` do `progress.md`, declarada e não restaurada), a
**P-39** (o plano do BD-6 sobre o RBAC de `GET /api/courses`, que virou a lição 18) e a **P-43**
(`der-fisico.md` chamando `certificates` de "planejada", fechada pelas duas lanes em paralelo, e
cuja lacuna remanescente virou a [P-52](./abertas.md#p-52)).

A **P-40** (o ramo "catálogo genuinamente vazio" do BD-6 medido em `d20bebc`, não remedido contra
HEAD) foi encerrada em 2026-08-22, no `bd12-load-state-e-listas`, e saiu no fechamento do
`feedbacks-resolver-escopo` e no do `BD-15-docs-guardrails-e-sincronizacao` (2026-08-22) — os
primeiros **posteriores** ao do BD-12, que é o que a linha do índice pedia. A **P-29** (corrida de
unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em duas profundidades)
foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram no fechamento do
`bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o que a linha
do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a **P-37**
(`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
