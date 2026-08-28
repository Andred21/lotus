# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

*(três: a **P-46**, a **P-02** e a **P-33**. A **P-03** e a **P-15** saíram nos dois
fechamentos de 2026-08-25; o parágrafo adiante é o rastro delas.)*

### P-46 — sem Preflight, toda tag de bloco carrega margem do agente do usuário

**Fechada em 2026-08-27**, no `frontend-hardening-final` (Task 4, `4a27272c`), e **remedida** — o
gatilho pedia decisão do João sobre reset escopado, e a decisão foi tomada e construída: um
mini-reset em `@layer base` (`frontend/src/index.css`) zera margem de `h1`–`h6`, `p`, `ul`, `ol` e
as grafias caso a caso (`m-0`, `[&_p]:m-0`, `list-none p-0`) saíram do repositório. Guardado por
`frontend/tests/preflight-escopado.test.ts` — a catraca lê o CSS inteiro, dentro e fora de
`@layer` (Q-1 do review de 2026-08-27, com duas sondas vistas reprovar). Medido no navegador em
2026-08-26 e remedido no fechamento: `AppCardHeader` com faixa de 49px para 24px de texto (era
80px), `AppCard variant="stat"` com 100px por card a 1440×900, e as quatro famílias de lista do
Dashboard sem marcador e com recuo 0 —
[`audits/2026-08-26-frontend-hardening-final-medicoes.md`](../audits/2026-08-26-frontend-hardening-final-medicoes.md).
O que o mini-reset alcançou além das nossas listas virou a [P-63](./abertas.md#p-63).

### P-02 e P-33 — retenção de `audits` e de `login_logs`

**A P-02 e a P-33 fecham dentro do bloco `hardening-auditoria-privacidade-e-observabilidade`
(2026-08-26)**, por **mecanismo**, nunca por promessa — formalização (saída deste arquivo) no
próximo `/fechar-sprint`:

- **P-02** (ADR-08: pruning/retenção da auditoria nunca decidida) — paga pela `RetentionPolicy`
  (`backend/app/Shared/Retention/RetentionPolicy.php`), que fixa as janelas decididas pelo João em
  2026-08-26: `audits` anonimiza `ip_address`/`user_agent`/`url` aos 12 meses
  (`AUDITS_ANONIMIZAR_MESES`) e descarta a linha inteira aos 5 anos (`AUDITS_DESCARTAR_MESES`).
  Executada por `lotus:podar-auditoria` (`PodarAuditoria`), agendada às 03:10 America/Santiago em
  `routes/console.php` e rodada pelo serviço `scheduler` do `docker-compose.prod.yml`. O índice
  `audits_created_at_index` (migration `2026_08_26_000001_add_created_at_index_to_audits_table`)
  sustenta o recorte por data — sem ele as duas fases varreriam a tabela inteira. O ADR-08 em
  `docs/adrs.md` aponta para este mecanismo em vez de repetir a lacuna.
- **P-33** (`login_logs.ip_address`/`user_agent` são dado pessoal sem retenção) — paga pela mesma
  `RetentionPolicy` (`LOGIN_LOGS_DESCARTAR_MESES = 12`), executada por `lotus:podar-logins`
  (`PodarLogins`, descarte direto — a tabela é PII pura, sem trilha de mudança a preservar), agendada
  às 03:40 America/Santiago no mesmo `routes/console.php` e pelo mesmo serviço `scheduler`.
  Consequência aceita e declarada: conta sem login há mais de 12 meses perde o "último acesso" que
  `User::latestLogin()` deriva daqui. **Nasceu como segunda `P-30`** e foi renumerada no
  `/fechar-sprint` do BD-3 (2026-08-12) — as menções a "P-30" na narrativa do `last-login` em
  `docs/superpowers/state.md` são desta pendência e ficam como estão.

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
