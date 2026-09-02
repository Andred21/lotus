# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

*(duas: a **P-73**, fechada em 2026-09-02 pelo bump de lockfile da PR #93, e a **P-67**, fechada em
2026-09-01 pelo `frontend-decisoes-de-ui-pendentes`. A **P-61** e a
**P-63** saíram neste mesmo fechamento — o primeiro posterior aos dos dois blocos que as encerraram
em 2026-08-30 —, e o parágrafo adiante é o rastro delas. A **P-66** saiu no fechamento do
`frontend-triagem-dos-audits-do-item-18` (2026-08-30), o primeiro posterior ao do
`hardening-performance-e-dados` que a encerrou — o índice `login_logs_created_at_index` é mecanismo
em migration, e o rastro dela está no git e na linha de entrega em `../historico/progress.md`. A
**P-02**, a **P-33** e a **P-46** saíram nos dois fechamentos de 2026-08-29, e a **P-03** e a
**P-15** nos dois de 2026-08-25; os parágrafos adiante são o rastro delas.)*

### P-73 — advisory transitiva nova reprova o `audit-dev` e segura a imagem da `main`

**Fechada em 2026-09-02**, na PR #93, pelo critério que a própria ficha escreveu: `pnpm audit` volta
a **0** em `frontend/` com o `package.json` **intacto**. O remédio é o que o item 20 fixou como
molde e a spec dele já tinha recusado a alternativa — bump só de lockfile, sem `pnpm.overrides`:

```
pnpm update browserslist --depth Infinity
```

`browserslist` **4.28.4 → 4.28.8** (patched era `>=4.28.7`), e `update-browserslist-db` acompanhou
de `1.2.3` para `1.3.2`. Diff de **um arquivo só**, `frontend/pnpm-lock.yaml` (25 inserções, 25
remoções); `git diff --stat frontend/package.json` **vazio**. As duas GHSA que reprovavam
([GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) e
[GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g)) saíram junto.

Provado local com os quatro passos do job antes de empurrar: `pnpm audit` → `No known
vulnerabilities found`, `pnpm install --frozen-lockfile` → `Already up to date`, `pnpm lint` → 0,
`pnpm test` → **125 arquivos / 714 testes**, `pnpm build` verde.

**O que a ficha previa e continua valendo:** o caso reincide — advisory transitiva nova em devDep
trava o release sem que bloco nenhum a tenha causado. O que fecha aqui é esta ocorrência, não a
classe; a próxima chega pelo mesmo caminho e o remédio já está medido.

---

### P-67 — a escala de raio estava escrita na rule e 10 sítios ficaram fora dela, sem catraca

**Fechada em 2026-09-01**, no `frontend-decisoes-de-ui-pendentes` (item 21, Tasks 1–3), por
mecanismo. A `D-66`, que a hospedava, decidiu a régua: o raio passa a vir de **token no `@theme`**
(`--radius-surface` e `--radius-control`, este lendo o var do tema do PrimeReact), `shared/ui` os
consome e `features/`+`app/` migram atrás. O planejamento remediu o alcance — os sítios eram **15**,
não os 10 que a ficha contava: cinco já escreviam `rounded-lg`/`rounded-md` e a catraca os
alcançaria igual, então migraram junto para ela não nascer vermelha.

A catraca é a `RAIO_LITERAL` (`no-restricted-syntax` em `frontend/eslint.config.js`), sobre as duas
camadas que a rule exige (`src/features/**` e `src/app/**`), e **nasceu verde** — foi vista reprovar
por sonda negativa antes de valer, com o arquivo restaurado do scratchpad (nunca por `git stash`).
A `.claude/rules/frontend-estilizacao.md` passou a descrever a escala que existe, em vez da que a
rule descrevia e a tela não tinha — que era exatamente por que os 10 sítios escreveram `rounded`.

Rastro: `feat(ui): raio ganha dois tokens no @theme e shared/ui os consome` (`97661217`),
`feat(ui): os 15 sitios de features e app consomem os tokens de raio` (`9d5af40a`) e
`feat(lint): RAIO_LITERAL nasce verde e a rule descreve a escala real` (`3c27c4f3`).

---

**A P-02 e a P-33 saíram no fechamento do `hardening-performance-e-dados` (2026-08-29)**, o
primeiro posterior ao do bloco que as encerrou. As duas fecharam em 2026-08-26 no
`hardening-auditoria-privacidade-e-observabilidade`, por **mecanismo** e não por promessa: a
`RetentionPolicy` (`backend/app/Shared/Retention/RetentionPolicy.php`), os comandos
`lotus:podar-auditoria` e `lotus:podar-logins`, o índice `audits_created_at_index` e o agendamento
em `routes/console.php`/`scheduler` do `docker-compose.prod.yml`. A **P-46** saiu no fechamento do
`frontend-estilizacao-padronizacao-de-componentes`, no mesmo dia e pelo mesmo critério. As três
estão no git e nas linhas de entrega em [`../historico/progress.md`](../historico/progress.md).

---

**A P-03 e a P-15 saíram nos dois fechamentos de 2026-08-25** — a fatia 2 do
`frontend-revisao-ui-por-modulo` e o `hardening-api-arquivos-e-abuso` —, os primeiros posteriores
aos dos blocos que as encerraram. As duas foram **remedidas antes de sair**, não removidas na fé, e
cada fechamento mediu de um lado:

- **P-03, na worktree:** o container `app` de `../fix-frontend` recebe do compose
  `APP_URL=http://localhost:8082`, `FRONTEND_URL=http://localhost:5175`,
  `SANCTUM_STATEFUL_DOMAINS=localhost:5175,localhost:8082` e `SESSION_COOKIE=lotus_session_8082` —
  medido com `docker compose exec -T app printenv` —, com o `backend/.env` da árvore ainda no offset
  antigo: a injeção vence, que é o mecanismo que a ficha declarou pago, e o login pelo navegador em
  `:5175` contra a API em `:8082` funciona com o arquivo como está.
- **P-03, no main tree:** o offset vive em `.env.example` e nas seis variáveis `LOTUS_DEV_*` do
  `docker-compose.yml`; a stack do fechamento do item 4 subiu no offset zero (`:8080`/`:3307`).
- **P-15:** o certificado do aluno está exposto no detalhe por `StudentTurmaData::$certificate`
  (`backend/app/Domains/Identity/Data/StudentTurmaData.php:36`), e o ramo recusado por escrito
  (coluna `CERTIFICADOS` na listagem de alunos) continua declarado na §9 da spec do
  `certificacao-historico-do-aluno` — que é o que impede a pendência de reabrir por silêncio.

**Saíram no fechamento do `frontend-revisao-ui-por-modulo` (2026-08-24), o primeiro posterior aos
dos blocos que as encerraram:** a **P-47** (os 7 redatores do seed sem a role `redator`, fechada em
2026-08-23 pela migration de backfill `2026_08_22_000003_backfill_redator_role` e **remedida aqui**
contra o MySQL de dev: os 7 do seed e os 2 usuários de gate e2e carregam a role) e a **P-50** (a
suíte unida acima do `memory_limit` de 128M, fechada em 2026-08-22 e também remedida aqui — o
`docker compose exec -T app php artisan test` do `CLAUDE.md` §6 terminou, 906 passed / 5 skipped).

**A P-41 saiu neste fechamento (`tabelas-coluna-de-acoes-e-largura`, 2026-08-24), o primeiro
posterior ao do bloco que a encerrou** — e foi **remedida antes de sair**, não removida na fé: o
`min-w-0` do bloco de texto está em `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx:74`. A
metade não paga do gatilho continua declarada onde ela vive: `IdentityCell.test.tsx` conta
`span.truncate` e não mede `scrollWidth > clientWidth` — trabalho do `frontend-hardening-final`,
**pago em 2026-08-27**: o teste guarda o par `truncate` + `min-w-0` (`e560df27`) e a medida real de
`scrollWidth > clientWidth`, que jsdom não faz, ficou no navegador (DoD 5 do audit do bloco, com
sonda negativa).

## Rastro anterior, já removido

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
