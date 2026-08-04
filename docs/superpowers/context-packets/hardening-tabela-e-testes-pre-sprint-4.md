---
schema_version: 1
packet_id: hardening-tabela-e-testes-pre-sprint-4
block_id: hardening-tabela-e-testes-pre-sprint-4
status: ready
generated_at: 2026-08-04T13:18:43-03:00
base_ref: main
base_commit: ce2d2e45d3d3780774f40b8bf08851d77f9175e7
state_path: docs/superpowers/state.md
state_blob_sha: 1e20026a6f8c8139107c1584f2ad1571e8b3f05f
progress_path: docs/superpowers/progress.md
progress_blob_sha: 84f047eb75a03935bb1a7b5ca8c025c075c80744
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening · tabela e testes pré-Sprint 4

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** registrar o escopo e os sinais de aceite externos de H.4.4, H.4.5 e H.4.9. As sete tasks já entregues entram somente como evidência de dependência satisfeita. `[I-SCOPE]` `[R-STATE]`

**Non-goals:** propor corte, ordem, plano ou implementação; reabrir H.4.1, H.4.2, H.4.3, H.3.1, H.4.6, H.4.7 ou H.4.8; introduzir Repository sobre Eloquent, CRUD base genérico, tabela universal, split massivo de DTOs ou split físico dos locales. `createCrudResource` permanece contrato existente do ADR-18, não autorização para abstração nova. `[I-SCOPE]` `[D-ADR]`

## Source registry

Exceção ao teto de cinco artefatos externos: as três páginas Notion eram obrigatórias, e a revalidação dirigida da ausência no Drive exigiu os inventários V2/Planejamento e o ADR — seis artefatos, sem busca ampla.

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| I-SCOPE | Instrução atual | Escopo explícito de `hardening-tabela-e-testes-pre-sprint-4` | 2026-08-04 | provided | Recorte, non-goals, dependências e transição |
| R-STATE | Git | `state.md` blob `1e20026a6f8c8139107c1584f2ad1571e8b3f05f`; `progress.md` blob `84f047eb75a03935bb1a7b5ca8c025c075c80744`; `backlog.md` blob `f3c49ad949a14dd74da2d5a65c4a1fd5f3a0a1da`; packet anterior blob `9ed7fe7a0f9cc9d64e9e16489a7f29e2d2e98644` | 2026-08-04T13:11:38-03:00 | retrieved | Estado construído, dependências, decisão H.4.5 e reconciliação |
| R-H44 | Git | `frontend/package.json` blob `325cc33fba387e11bd9b60fc0c32bf868710bf75`; `RedatoresTable.tsx` blob `ee37cf6f6e2d4f12fd06f4cd3207f9be063fa160`; `StudentsTable.tsx` blob `a2850c49ba23ed96fb4a1abcd402a7b83894e4c3`; `useTableFilter.ts` blob `cd5c2272226c56142cae92ca50d78d747876f453`; `AppCard.tsx` blob `505e50c54de495fd6d36f7fa31acee83547c201e`; `AppDataTable.tsx` blob `900ed56c9e7b117fd0298ffbf789ba64402cafd3` | 2026-08-04T13:11:38-03:00 | retrieved | Moldura atual das tabelas e Vitest instalado |
| R-H45 | Git | `useCrudPage.ts` blob `c92745ce18acbe4007e40c0a6b46ff9703ff32af`; aliases `useStudentsPage.ts` `71bd6be97bcfcda4865b87024c5a6666aa77608e`, `useRolesPage.ts` `190a26b62186f4f1e3df46e99183d0b4641ab44e`, `useRedatoresPage.ts` `6ef46c3813512c9b863140b7239c3b710d2b6e25`, `useUsersPage.ts` `b5306238c5faae437f2460372086dcb647a16ee6`, `useCoursesPage.ts` `b98aee0313a227e0ed0a60350700a54f5d656dbb`, `useClientsPage.ts` `6bcc8de025fe34c94bd3fbe09b7946aafe0f79d4`, `useBudgetsPage.ts` `a7e0fb39b8cb106bfed963c3117908e08867b6ab`; `eslint.config.js` blob `ad53880228026f9455ddb0c17a7e1e8495b80137` | 2026-08-04T13:11:38-03:00 | retrieved | Sete aliases, dono da query e escape do seletor |
| R-H49 | Git | `backend/tests/**` — 78 arquivos no commit; `backend/tests/TestCase.php` blob `f3880b3640c946eee77849d855e1d0703650b546` | 2026-08-04T13:11:38-03:00 | retrieved | Superfície atual de testes e helpers existentes |
| N-H44 | Notion | page `3b1bc9603dfa816fb0d4d722bdea4432`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-08-03T21:49:34.357Z | retrieved; Status: Backlog | Escopo, aceite e dependência de H.4.4 |
| N-H45 | Notion | page `3b1bc9603dfa81faaee2e01540598141`; collection/database canônicos acima | 2026-08-03T21:49:34.328Z | retrieved; Status: Backlog | Escopo, aceite e dependência de H.4.5 |
| N-H49 | Notion | page `3b1bc9603dfa81a19eeac038fe485dc2`; collection/database canônicos acima | 2026-08-03T21:49:34.328Z | retrieved; Status: Backlog | Escopo, aceite e dependência de H.4.9 |
| D-V2 | Google Drive | V2 folder `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM`; Planejamento folder `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3` | 2026-06-16T16:33:47.284Z / 2026-06-16T16:35:29.892Z | retrieved; no new hardening locator | Revalidação dirigida da ausência já confirmada |
| D-ADR | Google Drive | `decisao-stack.md` file `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` | 2026-07-31T16:15:51.504Z | retrieved | ADR-02/04/05/18 e limites arquiteturais |

## Key facts

1. As três páginas pertencem à collection canônica, continuam em `Backlog` e preservam os mesmos `Modified` do packet anterior. `[N-H44]` `[N-H45]` `[N-H49]`
2. O escopo ativo contém somente H.4.4, H.4.5 e H.4.9; as outras sete tasks estão entregues e não são reabertas. `[R-STATE]`
3. H.4.4 extrai por composição somente busca, toolbar, estados, tabela e paginação; `RedatoresTable` e `StudentsTable` já exibem a moldura repetida sobre os primitivos compartilhados. `[N-H44]` `[R-H44]`
4. Os sete `useXPage` são delegações diretas, mas `useCrudPage` chama `resource.useList()` internamente; o seletor vigente só detecta chamadas `xxxApi.useX()` em componentes. `[R-H45]`
5. H.4.9 cobre somente setup repetido em pelo menos três cenários; a superfície atual tem 78 arquivos de teste e `TestCase` centraliza autenticação, não uma factory genérica de agregados. `[N-H49]` `[R-H49]`
6. Dependências: H.4.4→H.4.3 está satisfeita pelo Vitest; H.4.9→H.4.6 está satisfeita pela entrega do piloto; H.4.5→H.4.4 permanece aberta, interna ao possível corte. `[N-H44]` `[N-H45]` `[N-H49]` `[R-STATE]` `[R-H44]`
7. O Drive V2 continua sem documento que delimite este hardening; a revalidação por IDs não encontrou novo locator, e `decisao-stack.md` fornece apenas ADRs e limites. `[D-V2]` `[D-ADR]` `[R-STATE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| H.4.5 | “Aliases sem valor são eliminados ou justificados”; a descrição admite remover delegações puras. `[N-H45]` | Eliminar é a resposta errada: os aliases devem ser justificados e o escape do seletor deve ser fechado. A decisão não determina se H.4.5 entra no corte. | Decisão interna posterior do fechamento de 2026-08-04, registrada em `state.md`/`backlog.md` e confirmada no código: `useCrudPage` possui a query e o ESLint não casa `useCrudPage(xApi)`. Essa evidência posterior vence o enunciado externo anterior. `[R-STATE]` `[R-H45]` |
| Fonte delimitadora | O Drive não contém documento específico; o Notion descreve as três tasks. `[D-V2]` `[N-H44]` `[N-H45]` `[N-H49]` | Usar os sinais das três páginas sob os limites dos ADRs, sem inferir corte ou implementação. | Instrução explícita atual, ausência reconfirmada e ADRs canônicos. `[I-SCOPE]` `[D-ADR]` |

## Constraints

- Preservar busca, paginação, erro e estados vazios; colunas, células e regras de domínio continuam nas features. `[N-H44]`
- Não criar god-hook, tabela universal, API com flags de domínio ou factory por simetria. `[N-H44]` `[N-H45]` `[N-H49]`
- Branch `main`, commit solicitado e working tree limpo na geração. `[R-STATE]`

## External acceptance signals

- H.4.4: `RedatoresTable` e `StudentsTable` usam a moldura compartilhada; outras tabelas só migram quando equivalentes; comportamento permanece idêntico. `[N-H44]`
- H.4.5: aliases são eliminados ou justificados, responsabilidades ficam explícitas, componentes permanecem declarativos e nenhum god-hook nasce — reconciliado acima pela alternativa “justificados”. `[N-H45]`
- H.4.9: somente setups repetidos em pelo menos três cenários são extraídos; testes ficam menores sem esconder regras; nenhuma factory nasce apenas por simetria. `[N-H49]`

## Open questions

- Nenhuma bloqueante. O brainstorming decide quais das três tasks entram no corte, sem reabrir a decisão técnica de H.4.5.

## Deferred

- Corte, ordem, plano e implementação.
- As sete tasks entregues e débitos técnicos vizinhos permanecem fora deste escopo.

## Staleness triggers

- Mudança do `active_work_item`, do recorte das três tasks ou dos non-goals.
- Alteração de escopo, aceite, dependência, status ou `Modified` em qualquer uma das três páginas Notion.
- Novo documento canônico no Drive que delimite ou contradiga o hardening, ou mudança material nos ADRs aplicáveis.
- Mudança nas tabelas referenciadas, em `useCrudPage`, nos sete aliases, no seletor ESLint ou na infraestrutura de testes que altere os fatos registrados.
- Reabertura por João da decisão técnica de H.4.5 ou decisão de brainstorming/spec que altere o corte externo reconciliado.
