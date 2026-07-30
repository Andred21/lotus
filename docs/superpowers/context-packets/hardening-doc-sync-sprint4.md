---
schema_version: 1
packet_id: hardening-doc-sync-sprint4-v1
block_id: hardening-doc-sync-sprint4
status: ready
generated_at: 2026-07-30
base_ref: main
base_commit: 339c6a033a076375d06d0ec4604efdbc2c42c97b
state_path: docs/superpowers/state.md
state_blob_sha: 51b6a81d7b32d27bcd32fd6e3ad52e331208319e
progress_path: docs/superpowers/progress.md
progress_blob_sha: 2811be9f588e9cb95c68ea5aafc2dd37ba0b0d58
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening · H.1.3.1 — Sincronização de documentação e fontes canônicas

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** auditar código ↔ `/docs` ↔ Drive ↔ Notion; tornar divergências e decisões sem proveniência explícitas; reconciliar o que tiver base decisória; atualizar documentação interna; aplicar somente writes externos autorizados; repetir a auditoria e registrar o que permanecer aberto.

**Non-goals:** implementar features, redesenhar arquitetura, alterar schema ou comportamento, avançar Superpowers, escrever externamente sem autorização específica ou fazer auditoria visual de UI.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-SCHEMA | Google Drive | `modelo-fisico-e-diagramas.md` · `1GLv7fNsvZccrJ2CsbJDeFhqWo7BNl4ad` | 2026-07-16T07:32:08.370Z | retrieved | Schema físico e arquitetura representada |
| DRIVE-STACK | Google Drive | `decisao-stack.md` · `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` | 2026-07-10T19:07:22.381Z | retrieved | ADRs canônicos e pendências declaradas |
| DRIVE-DOMAIN | Google Drive | `modelo-conceitual.md` · `1QB9ei5JiWV33GNmXxZH_8_hSZPqoY_3a` | 2026-07-10T19:09:17.914Z | retrieved | Relações e terminologia de domínio |
| DRIVE-PEOPLE | Google Drive | `tela-pessoas.md` · `1NFgZxUmCLynk8q1Rsg-3cP-973740V0V` | 2026-06-16T15:42:19Z | retrieved | Contratos e responsabilidades de Pessoas |
| NOTION-H131 | Notion | `Sincronização de documentação e fontes canônicas` · `e30bc960-3dfa-828b-9d12-01d537820e9d` | 2026-07-20T21:14:00Z | retrieved | Work item H.1.3.1 e organização da Sprint 4 |

## Key facts

1. A task Notion H.1.3.1 está em `Backlog`, módulo `Hardening`, Sprint 4, com descrição apenas “Alinhar código ↔ /docs ↔ Drive canônico ↔ Notion”; `Critério de aceite`, dependências e ADR ref estão vazios. O escopo explícito do chamador e de `state.md` é, portanto, a definição mais completa disponível. `[NOTION-H131]`
2. O Notion respondeu por busca e fetch reais. A afirmação da skill/`AGENTS.md` verificada em 2026-07-23 de que o namespace não carrega está desatualizada. `[NOTION-H131]`
3. O Drive conserva as decisões estruturais ADR-01–15 e ADR-17: DDD-lite sem Repository, DTOs como fronteira TS, Sanctum cookie/CSRF, auditoria na aplicação, RDS, S3 e Gotenberg. `[DRIVE-STACK]`
4. O Drive ainda determina `turmas.redator_id` e relação Redator→Turma 1:N; o modelo conceitual repete “um redator ministra uma turma”. `[DRIVE-SCHEMA]` `[DRIVE-DOMAIN]`
5. A decisão posterior D5, explicitamente atribuída ao João em 2026-07-21, substituiu essa cardinalidade por N:N via `turma_redator`; migration e model implementam o pivot. `docs/der-fisico.md` e a referência herdada ao fim de `docs/adrs.md` continuam contraditórios, conforme P-06.
6. O Drive prescreve `/api/alunos`, mudança de vínculo do cliente na edição e certificados no detalhe do aluno. `[DRIVE-PEOPLE]`
7. A spec posterior do módulo Alunos decide: D3 — edição não toca vínculo; D7 — API `/students`; D10 — certificados ausentes até o Bloco 7; D11 — `Redactores` permanece como primeira aba. P-14/P-15/P-16 já preservam essas divergências e seus gatilhos.
8. `docs/adrs.md` revisou ADR-15 em 2026-07-17 e contém ADR-16, ADR-18 e ADR-19 ausentes do Drive; ADR-16 registra expressamente que ainda não foi espelhado. P-04 também está vencida: a Sprint 3 fechou sem reavaliação dos guardrails.

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Notion no runtime | Inventário de 2026-07-23 dizia indisponível | Conector disponível | Busca e fetch bem-sucedidos de `[NOTION-H131]` em 2026-07-30 |
| Redator↔Turma | FK 1:N `[DRIVE-SCHEMA]` `[DRIVE-DOMAIN]` | Pivot N:N | Spec `2026-07-21-bloco6b-turma-designacao-design.md` D5, decisão explícita do João; migration/model atuais |
| API de alunos | `/api/alunos` `[DRIVE-PEOPLE]` | `/api/students` | Spec `2026-07-27-bloco-alunos-modulo-design.md` D7; P-14 |
| Vínculo e certificados do aluno | Edição troca cliente e detalhe mostra certificados `[DRIVE-PEOPLE]` | Edição não toca vínculo; certificados aguardam Bloco 7 | Mesma spec, D3 e D10; P-15 |
| ADRs canônicos | ADR-15 antigo; sem ADR-16/18/19 `[DRIVE-STACK]` | Snapshot operacional está em `docs/adrs.md` | Revisão registrada no ADR-15 e notas dos ADR-16/18/19; espelhamento externo depende de autorização |

## Constraints

- Drive permanece canônico; um snapshot do repositório só prevalece quando registra decisão posterior aplicável.
- Writes no Drive ou Notion exigem autorização explícita identificando ação e alvo.
- Figma não foi consultado: os documentos recuperados não o tornam autoridade necessária para schema/arquitetura, e o bloco não é de UI.
- Worktree permaneceu limpo; nenhuma alteração ou teste mutável foi executado.

## External acceptance signals

- Notion exige alinhamento entre código, `/docs`, Drive e Notion. `[NOTION-H131]`
- O aceite explícito exige auditoria repetida após as correções e registro das pendências não resolvidas.
- Nenhuma divergência pode ser ocultada ou resolvida por prioridade sem evidência aplicável.

## Open questions

- A autorização e a ciência do João para espelhar no Drive ADR-15 revisado, ADR-16/18/19, schema N:N e rota `/students` ainda precisam ser verificadas antes de qualquer write externo; isso não bloqueia a auditoria nem o planejamento.

## Deferred

- Revalidação visual de P-16 no Figma, salvo se o planejamento ampliar explicitamente o escopo para contrato de UI.
- Implementação de Certificação, guardrails ou alterações de schema/comportamento; o bloco apenas documenta seu estado e proveniência.

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` passar a definir outro escopo.
- Alteração semântica nos documentos Drive ou na task Notion registrados.
- Reabertura ou substituição das decisões D3/D5/D7/D10/D11 ou ADR-15–19.
- Mudança no código/schema que altere `turma_redator`, `/api/students`, vínculo de aluno ou disponibilidade de certificados.
- Nova evidência de proveniência ou autorização externa que resolva a questão aberta.
