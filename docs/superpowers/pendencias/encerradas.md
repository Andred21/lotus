# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-15 — certificados não aparecem no módulo de alunos

**Bloco:** certificacao-historico-do-aluno · **Gatilho:** fechava quando o João decidisse expor (ou
não) certificados na listagem e no detalhe do aluno, ou se a Lotus pedisse.

O protótipo mostra coluna `CERTIFICADOS` na listagem e card `CERTIFICADOS EMITIDOS` no detalhe;
implementado não tinha nenhum dos dois.

Bloco alunos (2026-07-27, spec D10): `app/Domains/Certification/` era pasta vazia e não existia
migration de `certificates`. Card vazio foi rejeitado explicitamente: afirmar "sem certificados"
quando a verdade é "o módulo não existe" é falha silenciosa, e aqui o dado tem peso legal.
**Proveniência de D10 ratificada pelo João no doc-sync 2026-07-30.**

O gatilho venceu duas vezes sem produzir decisão: em **2026-08-07** o Bloco 7 entregou `certificates`
e a vertical até a API pública; em **2026-08-08** o `certificacao-frontend` entregou o módulo próprio
`/certificados` (Emisión + Historial) e **não tocou o módulo de alunos**.

**Encerrada em 2026-08-24, no `certificacao-historico-do-aluno`: a decisão que ela esperava foi
tomada.** Certificados passam a aparecer no **detalhe** do aluno, como coluna da tabela de turmas —
código, estado derivado no servidor, data quando o curso tem prazo, marca de reemissão com a
contagem de anteriores e o PDF pela própria célula.

**O outro ramo fica fora por escrito, não por omissão:** a coluna `CERTIFICADOS` na **listagem** de
alunos está declarada fora de escopo na §9 da spec do bloco. Isto é o que impede a pendência de
reabrir por silêncio — o protótipo pedia os dois sítios, um foi construído e o outro foi recusado
com registro.

**Sai quando:** primeiro fechamento **posterior** a este.

---

**Saíram neste fechamento (`frontend-revisao-ui-por-modulo`, 2026-08-24), o primeiro posterior aos
dos blocos que as encerraram:** a **P-47** (os 7 redatores do seed sem a role `redator`, fechada em
2026-08-23 pela migration de backfill `2026_08_22_000003_backfill_redator_role` e **remedida aqui**
contra o MySQL de dev: os 7 do seed e os 2 usuários de gate e2e carregam a role) e a **P-50** (a
suíte unida acima do `memory_limit` de 128M, fechada em 2026-08-22 e também remedida aqui — o
`docker compose exec -T app php artisan test` do `CLAUDE.md` §6 terminou, 906 passed / 5 skipped).

## Rastro anterior, já removido

**A P-41 saiu neste fechamento (`certificacao-historico-do-aluno`, 2026-08-24), o primeiro
posterior ao do bloco que a encerrou** — e foi **remedida antes de sair**, não removida na fé: o
`min-w-0` está de pé no bloco de texto empilhado de
`frontend/src/shared/ui/IdentityCell/IdentityCell.tsx:74` e o `shrink-0` no avatar (`:46`). A metade
não paga do gatilho continua declarada e agrupada no `frontend-hardening-final`: o
`IdentityCell.test.tsx` ainda conta `span.truncate` em vez de medir
`scrollWidth > clientWidth` (lição 10).

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
