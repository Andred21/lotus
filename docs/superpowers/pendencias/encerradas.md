# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

*(uma: a **P-63**, fechada no bloco que este fechamento encerra. A **P-66** saiu neste
fechamento (`frontend-triagem-dos-audits-do-item-18`, 2026-08-30), o primeiro posterior ao do
`hardening-performance-e-dados` que a encerrou — o índice `login_logs_created_at_index` é mecanismo
em migration, e o rastro dela está no git e na linha de entrega em `../historico/progress.md`. A
**P-02** e a **P-33** saíram no fechamento do `hardening-performance-e-dados` (2026-08-29) e a
**P-46** no do `frontend-estilizacao-padronizacao-de-componentes` (2026-08-29), os primeiros
posteriores aos dos blocos que as encerraram. A **P-03** e a **P-15** saíram nos dois fechamentos de
2026-08-25; os parágrafos adiante são o rastro delas.)*

### P-63 — o `role="list"` do mini-reset não alcança lista renderizada por biblioteca

**Fechada em 2026-08-29**, no `frontend-triagem-dos-audits-do-item-18` (Task 12), por mecanismo: a
legenda do `AppLineChart` passou a ter conteúdo próprio (`shared/ui/AppLineChart/legend.tsx`) —
`<ul role="list">` com o texto na tinta secundária e o marcador na tinta da série —, porque a
f2 UI-09 do audit de 2026-08-28 mediu o texto da legenda abaixo de AA no claro e o gatilho desta
ficha ("bloco que tocar gráfico") disparou. Guarda em `legend.test.tsx`; medida na run 5
(`audits/2026-08-29-item19-run5.md`): zero `ul` sem `role` no Dashboard.

**Bloco:** — o hospedeiro (item 18) fechou em 2026-08-29 sem pagá-la; rehospedar é do João · **Gatilho:** bloco que
tocar gráfico ou o mini-reset e puder decidir o remédio — escopar o `list-style: none` aos nossos
elementos, ou pôr `role="list"` no wrapper de terceiro. Revisar em **2026-10-31**.

Medido no fechamento do `frontend-hardening-final` (2026-08-27), Chromium real, Dashboard a
1440×900: varrendo **todo** `ul` da página, dois ficam sem `role` — as duas legendas do Recharts
(`ul.recharts-default-legend`, dentro de `.recharts-legend-wrapper`, uma no gráfico de
`Certificados emitidos` e outra no de `UF aprobada`).

O mini-reset da **P-46** crava `list-style: none` em todo `ul` da aplicação, e no WebKit isso tira a
semântica de lista junto — foi o que o **Q-6** do review de 2026-08-27 corrigiu, pondo `role="list"`
nas 16 listas do repositório e uma régua de lint que exige o atributo daqui pra frente. A régua lê
JSX: lista que nasce dentro de biblioteca não passa por ela, e o reset alcança essas listas do mesmo
jeito. As 16 nossas estão cobertas; a borda são as de terceiro.

**Alcance pequeno, e por isso ficou aberta:** as duas listas são legendas de gráfico, cada item já
carrega `aria-label` próprio no `<svg>`, e o conteúdo delas é decorativo em relação ao dado (que é o
gráfico). Não reabre o DoD 4 do bloco — as quatro famílias que a spec §5 mediu continuam corretas e
com `role`.

**Nasceu como `P-61` na branch `refactor/frontend-hardening-final` e foi renumerada no merge da
`main`**, que já trazia uma `P-61` (os `title` do `ProblemDetails` em português) e uma `P-62` vindas
do `hardening-api-arquivos-e-abuso` e do `cicd-ci-governanca-e-artefato` — mesmo precedente que
renumerou a `P-38` para `P-41` e a `P-61` da `lane-b` para `P-62`.

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
