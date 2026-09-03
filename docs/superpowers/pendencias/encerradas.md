# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

*(cinco, todas fechadas em **2026-09-03** pelo `frontend-dividas-de-mecanismo` (item 25). A **P-73**
e a **P-67** saíram neste mesmo fechamento — o primeiro posterior aos dos blocos que as encerraram
em 2026-09-02 e 2026-09-01 —, e o parágrafo adiante é o rastro delas.)*

### P-69 — o vitest não tem `setupFiles`, então nada desmonta o que um teste monta

**Fechada em 2026-09-03**, por mecanismo, no item 25 (Tasks 2 e 3). `frontend/vite.config.ts` passou
a declarar `setupFiles: ["./src/test-setup.ts"]`, e o arquivo carrega o `afterEach(cleanup)` global
da Testing Library. Duas catracas guardam o mecanismo, as duas **vistas reprovar por sonda** antes
de valer:

- guarda estática do `setupFiles` (`frontend/tests/desmonte-global.test.ts`): 2 asserções reprovadas com
  o mecanismo ainda inexistente;
- `CLEANUP_A_MAO` no `eslint.config.js` (seletor
  `CallExpression[callee.name="afterEach"] Identifier[name="cleanup"]`): **31 erros** antes da
  remoção, 0 depois. Ela entra em **cinco arrays existentes**, e não em bloco próprio: bloco próprio
  apagaria por merge raso a catraca de cor nos arquivos de teste.

Os 31 desmontes à mão saíram (a spec contava 28 — contou uma grafia só; `afterEach(() => cleanup())`
estava viva também em `src/app/`). A rodada **termina**: 128 arquivos / 759 testes.

**Medição que contradisse a própria ficha:** o `ReferenceError: window is not defined` que a ficha
descreve **não reproduz** no vitest 4.1.10 — a suíte inteira passava sem `setupFiles` e sem o
`cleanup()` do `useServerTable.test.tsx`. Por isso a prova é a guarda estática mais a catraca, e não
a sonda negativa que a spec havia desenhado.

### P-68 — o `max-lines` mede arquivo de teste em `features/` e não mede em `app/`, e nada declara por quê

**Fechada em 2026-09-03**, por **decisão escrita**, no item 25 (Task 6), na direção que o precedente
do item 18 já apontava: a régua de 150 **continua** valendo para arquivo de teste em
`src/features/*/components/**`, e agora o `eslint.config.js` diz por quê, ao lado da régua e em
contraponto explícito à isenção de `src/app/**` doze linhas abaixo. **Zero mudança de
comportamento** — a assimetria deixou de ser acidente e virou escolha registrada.

### P-70 — o `screenDetail` continua calando o `detail` do servidor depois que ele passou a ser localizado

**Fechada em 2026-09-03**, por mecanismo, no item 25 (Task 4). `screenDetail` passou a devolver o
`detail` do servidor quando o envelope não é do front **e** o status está na allowlist fechada
`DETALHE_LOCALIZADO = new Set([403, 404, 429])` (`frontend/src/shared/lib/screenDetail.ts:65`). Todo
o resto segue calado — `500`, `419`, `405`, `503` e qualquer status novo: status que ninguém decidiu
não entra sozinho. O docblock foi reescrito, porque a frase vigente ("só vai o que o FRONT
escreveu") deixou de ser verdade.

Prova em duas camadas: casos de unidade em `screenDetail.test.ts` (403/404/429 devolvem o `detail`;
500 e 419 devolvem `undefined`; `''` e `null` viram `undefined` nos três status novos) e um teste em
jsdom que afirma o **texto na tela** — a frase do servidor no 403, a dica do i18n no 500 —, que é o
"na tela" que o DoD da ficha cobrava. A allowlist foi vista reprovar com 2 casos antes da política
existir.

### P-30 — o `warning` segue com o laranja de stock do Lara

**Fechada em 2026-09-03**, por mecanismo, no item 25 (Task 5). A decisão do João no brainstorming
(D3) foi **alinhar o warning ao amarelo que o `AppTag` já usava**, e não construir um âmbar novo: a
troca é transformação de **forma** no `frontend/scripts/generate-brand-theme.mjs`, no molde do
`textoSobrePrimaria` (D-P8), então alcança toda superfície que o Lara pinta de laranja nas duas
folhas — não só o botão que existe hoje. Régua de contraste nova em `frontend/tests/tone-ink.test.ts`
com o par de HOJE incluído, medido reprovando (**2,80:1** no filled do claro) para a régua registrar
o defeito que fecha.

**A receita da spec foi corrigida pela medição:** trocar degrau a degrau na mesma posição regredia
hover (3,30:1), active (2,29:1) e o `outlined` (1,92:1) no tema claro — pior que o defeito original.
A receita construída escurece a tinta e sobe a rampa nos estados (direção que o Lara já usa no tema
escuro) e mede 4,55 / 5,12 / 5,82 / 5,70.

**Achado que não se pagou aqui e virou ficha:** no tema claro a família inteira de botão de
severidade reprova AA no estado base (success 2,28:1, info 2,77:1, danger 3,76:1, help 3,96:1) — o
`warning` nunca foi caso especial. É a [P-74](./abertas.md), aberta neste mesmo fechamento.

### P-42 — a grafia construída do `IdentityCell` diverge da D1 da própria spec

**Fechada em 2026-09-03**, por **decisão escrita**, no item 25 (Task 7), na direção que o João já
tinha tomado em 2026-08-14 com a tela na frente: **o registro se alinha ao código**, o código não
volta ao D1. `specs/archive/2026-08-14-celula-de-identidade-design.md` ganhou a *Emenda de 2026-09-02
ao D1 (P-42)* — a grafia construída (`font-semibold` no título, `text-sm font-medium` na descrição,
`gap-2` entre as linhas), o motivo (achado Q-3 do `/revisar-sprint`, rejeitado pelo João) e a
consequência medida (o `gap-2` × N linhas muda a altura de toda tabela que usa a célula). O snapshot
**não foi reescrito em silêncio**: ganhou linha nova datada, no molde da emenda de 2026-08-24 ao
ADR-13, e o docblock do `IdentityCell.tsx` aponta para ela. **Código intocado.**

## Rastro anterior, já removido

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
