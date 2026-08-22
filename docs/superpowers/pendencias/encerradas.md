# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-43 — `der-fisico.md` listava `certificates` como "planejada", e as tabelas existem desde a Sprint 4

**Bloco:** BD-15 · **Gatilho (vencido):** fechava no primeiro bloco que tocasse `docs/der-fisico.md`
por outro motivo. Venceu em **2026-08-22**, no `feedbacks-resolver-escopo`: o commit `608a436c`
tocou o arquivo para mapear RF-FBK à documentação de turma.

**Encerrada em 2026-08-22, no fechamento do `feedbacks-resolver-escopo`, por decisão do João no
gate** — o item 7 parou porque honrar a ficha mexia no contador que o **Q-2 do review** tinha
acabado de reescrever (`26/19` → `25/18`), e esse número não se corrige sozinho.

**O alcance era maior que os quatro sítios da ficha.** Medido no gate, contra o banco de dev:
`certificates` com **6 linhas**, `certificate_sequences` com **1**, ambas criadas por
`2026_08_05_100000_certificates.php` (2026-08-05, Sprint 4), com `Certificate.php` e
`CertificateSequence.php` no domínio. Sítios corrigidos:

- os três de status — `courses` 1:N, `enrollments` 1:1 e a linha de descrição — perderam o
  "(planejada)";
- o contador virou "25 tabelas — 18 de domínio, **todas implementadas**", sem o "no papel", e a
  linha de implementadas passou a citar as duas de 2026-08-05;
- **o quinto sítio, que a ficha não contava:** a seção `Tabelas PLANEJADAS` ainda abria com "Não
  existem como migration ainda" e trazia as duas tabelas em rascunho PT/ES. Passou a
  `Tabelas que NÃO existem (e por quê)`, que hoje só guarda o registro da decisão de Feedback;
- a legenda do topo que explicava "Tabelas planejadas = mantidas em PT/ES" saiu: nenhuma tabela de
  domínio segue no papel, então a convenção não descrevia mais nada.

**O rascunho PT/ES divergia do schema real**, e por isso não foi promovido como estava: prometia
`enrollment_id FK,UK` e um `qr_code_hash UK` que **não existe em lugar nenhum do backend**
(`grep` vazio), e omitia `redator_id`, `snapshot`, `revoked_at`, `revocation_reason` e a coluna
gerada `active_enrollment_id`. A entrada nova em Certification foi escrita a partir da migration,
não do rascunho — que é o que a seção IMPLEMENTADAS promete ("batendo 1:1 com as migrations reais").

**Sai quando:** primeiro fechamento **posterior** a este.

---

## Rastro anterior, já removido

A **P-40** (o ramo "catálogo genuinamente vazio" do BD-6 medido em `d20bebc`, não remedido contra
HEAD) foi encerrada em 2026-08-22, no `bd12-load-state-e-listas`, e saiu aqui, no fechamento do
`feedbacks-resolver-escopo` (2026-08-22) — o primeiro **posterior** ao do BD-12, que é o que a linha
do índice pedia. A **P-29** (corrida de unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em
duas profundidades) foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram aqui, no
fechamento do `bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o
que a linha do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a
**P-37** (`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
