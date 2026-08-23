# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-47 — os redatores do seed não têm a role `redator`, e o bloco que a criou só a atribui adiante

**Bloco:** hardening-acesso-ownership-e-integridade · **Gatilho:** o bloco que puder reseedar o
banco de dev (mesmo gatilho da [P-44](./abertas.md#p-44)), ou o primeiro gate `permission:` aplicado
sobre rota de redator — é quando a falta deixa de ser cosmética.

Medido no `/fechar-sprint` de 2026-08-19: dos 7 redatores do `OperationDemoSeeder`, **nenhum**
carregava a role `redator` que o `RolePermissionSeeder.php:38` define. O bloco
`identity-ativacao-acesso-redator` fechou as duas portas por onde a role passa a ser atribuída —
`CreateRedatorAction` (cadastro novo) e `SendRedatorAccessInvitationAction` (reenvio de convite, o
achado **Q-1** do review) —, mas nenhuma delas alcança linha que já existe no banco sem convite
reenviado.

**Encerrada em 2026-08-23 pelo `hardening-acesso-ownership-e-integridade`, e o remédio não foi o
que a ficha supunha.** O planejamento mediu contra o código, não contra o texto da ficha: o
**seeder já estava certo desde `e3490d84`** — quem nasce hoje nasce com a role. O que faltava era
**dado velho**, e dado velho não se conserta em seeder que ninguém roda de novo. O conserto é a
migration de backfill `2026_08_22_000003_backfill_redator_role.php` (`fa1abdf1`), com
`BackfillRedatorRoleMigrationTest` cobrindo o `up()`.

**Provado contra o banco de dev no gate de fechamento (2026-08-23):** os 7 redatores do seed —
`redator_id` 1 a 7, `user_id` 2 a 8 — carregam `roles=[redator]`, sem convite reenviado e sem
reseed. O gatilho da ficha (reseedar o dev) deixou de ser a única saída: o backfill alcança banco
já provisionado, que é exatamente o caso de produção.

**Sai quando:** primeiro fechamento **posterior** a este.

---

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
