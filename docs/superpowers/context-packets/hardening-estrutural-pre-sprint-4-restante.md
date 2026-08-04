---
schema_version: 1
packet_id: hardening-estrutural-pre-sprint-4-restante
block_id: hardening-estrutural-pre-sprint-4-restante
status: ready
generated_at: 2026-08-04T02:05:10-03:00
base_ref: main
base_commit: 7419c320648480a6ac6d3f472bdf4a9206e91048
state_path: docs/superpowers/state.md
state_blob_sha: 5b1637f546ecbf70ad7372e3b49f2bfff21e797c
progress_path: docs/superpowers/progress.md
progress_blob_sha: 385fa1525ac156a6da2a8ab3acfc92c4ef1bd578
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening estrutural pré-Sprint 4 — restante

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** registrar o escopo e os sinais de aceite externos de H.3.1 e H.4.4–H.4.9. H.4.1–H.4.3 são estado já construído, usado apenas para avaliar dependências. `[R-SCOPE]` `[R-BUILT]`

**Non-goals:** propor corte, ordem, plano ou implementação; reabrir H.4.1–H.4.3; introduzir Repository sobre Eloquent, CRUD base genérico, tabela universal, split massivo de DTOs ou split físico imediato dos locales. `createCrudResource` permanece contrato existente do ADR-18, não autorização para abstração nova. `[R-SCOPE]` `[D-ADR]`

## Source registry

Exceção ao teto de cinco artefatos externos: o pedido exige reconsulta individual de sete páginas Notion; o refresh também revalida as pastas e os três documentos Drive que fundamentavam a ausência e os limites arquiteturais no packet anterior.

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| R-SCOPE | Git | `state.md` blob `5b1637f5`; `backlog.md` blob `9853a25d`; commit `7419c320648480a6ac6d3f472bdf4a9206e91048` | 2026-08-04 | retrieved | Bloco ativo, recorte restante, non-goals e árvore limpa |
| R-BUILT | Git | `DomainDependencyTest.php` blob `6195ab4f`; `frontend/eslint.config.js` `bee669b7`; `package.json` `325cc33f`; `vite.config.ts` `bc6ed154` | 2026-08-04T02:00:08-03:00 | retrieved | Estado construído de H.4.1–H.4.3 |
| N-H31 | Notion | page `39dbc9603dfa81f39e52ec6033137656`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-07-14T11:21:17.569Z | retrieved | Escopo, aceite, dependência e status de H.3.1 |
| N-H44 | Notion | page `3b1bc9603dfa816fb0d4d722bdea4432`; collection/database canônicos acima | 2026-08-03T21:49:34.357Z | retrieved | H.4.4 |
| N-H45 | Notion | page `3b1bc9603dfa81faaee2e01540598141`; collection/database canônicos acima | 2026-08-03T21:49:34.328Z | retrieved | H.4.5 |
| N-H46 | Notion | page `3b1bc9603dfa81c0b7d0cc7d46fa04ea`; collection/database canônicos acima | 2026-08-03T21:49:34.362Z | retrieved | H.4.6 |
| N-H47 | Notion | page `3b1bc9603dfa815c991bd10373d74cf6`; collection/database canônicos acima | 2026-08-03T21:49:34.328Z | retrieved | H.4.7 |
| N-H48 | Notion | page `3b1bc9603dfa81f597d0dc2913b38988`; collection/database canônicos acima | 2026-08-03T21:49:34.328Z | retrieved | H.4.8 |
| N-H49 | Notion | page `3b1bc9603dfa81a19eeac038fe485dc2`; collection/database canônicos acima | 2026-08-03T21:49:34.328Z | retrieved | H.4.9 |
| D-FOLDERS | Google Drive | V2 folder `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM`; Planejamento `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3` | 2026-06-16T16:33:47.284Z / 2026-06-16T16:35:29.892Z | retrieved; no hardening-specific match | Inventário e buscas dirigidas |
| D-ADR | Google Drive | `decisao-stack.md` file `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` | 2026-07-31T16:15:51.504Z | retrieved | ADR-02/04/05/18 e limites |
| D-CERT | Google Drive | `modulo-certificacao.md` file `1Jdm3iiAdK7A1RUrmeEC7pWBRvYIu0SzC` | 2026-06-14T19:16:46.000Z | retrieved; ruled out | Fronteira futura de Certification, sem escopo deste hardening |
| D-SETUP | Google Drive | `SETUP_AMBIENTE_LOTUS.md` file `1L8vq7Pp1xFBSvzyISg5sw6SVVihzSR5l` | 2026-06-24T15:37:08.000Z | retrieved; ruled out | Setup/Sprint 0, sem escopo deste hardening |
| D-RULEDOUT | Google Drive | `Planilha_Projetos_Integrada` file `1wQULGgZ9XNx7pAagaq_W9uSbvvgipVdmfq6sEPRXd7Y` | 2026-05-21T00:21:53.271Z | ruled out | Falso positivo de busca ampla, fora do V2 indicado |

## Key facts

1. As sete páginas permanecem na base canônica, sem mudança de conteúdo/`Modified`; todas continuam com `Status: Backlog`, portanto nenhuma foi marcada concluída pelo bloco anterior. `[N-H31]` `[N-H44]` `[N-H45]` `[N-H46]` `[N-H47]` `[N-H48]` `[N-H49]`
2. H.3.1 cobre posse em `addresses`, `contacts`, `templates` e `files`; acesso nested cruzado deve resultar em 403/404 e possuir teste de integração. `[N-H31]`
3. H.4.4 extrai somente a moldura de busca, toolbar, estados, tabela e paginação; H.4.5 revisa aliases `useXPage` sem criar god-hook. `[N-H44]` `[N-H45]`
4. H.4.6 é um piloto real sem service locator, não migração geral de DTOs; mudança na convenção de contrato único exige decisão explícita e atualização do ADR/rule. `[N-H46]` `[D-ADR]`
5. H.4.7 centraliza apenas transporte multipart; tipos, query keys, invalidações e regras permanecem nos domínios. `[N-H47]`
6. H.4.8 automatiza paridade de chaves sem reorganizar os locales; H.4.9 extrai apenas setup repetido em pelo menos três cenários. `[N-H48]` `[N-H49]`
7. Dependências já satisfeitas: H.4.4→H.4.3 pelo Vitest; H.4.6→H.4.1 pelo `DomainDependencyTest`; H.4.7/H.4.8→H.4.2 pelos três guardrails ESLint. Restam internas H.4.5→H.4.4 e H.4.9→H.4.6. `[N-H44]` `[N-H45]` `[N-H46]` `[N-H47]` `[N-H48]` `[N-H49]` `[R-BUILT]`
8. O Drive continua sem documento que delimite este hardening: os alvos confirmados tratam ADRs, Certification ou setup. `[D-FOLDERS]` `[D-ADR]` `[D-CERT]` `[D-SETUP]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Fonte do escopo | Drive não delimita o hardening; Notion detalha as tasks. `[D-FOLDERS]` `[N-H31]` `[N-H44]` `[N-H45]` `[N-H46]` `[N-H47]` `[N-H48]` `[N-H49]` | O packet cobre as sete tasks restantes, sob os ADRs; H.4.1–H.4.3 são somente pré-condições. | Instrução explícita atual + `state.md`/backlog no ref solicitado. `[R-SCOPE]` |
| Dependências | Notion ainda aponta H.4.3/H.4.1/H.4.2 como dependências. `[N-H44]` `[N-H46]` `[N-H47]` `[N-H48]` | Essas dependências estão satisfeitas; somente H.4.5→H.4.4 e H.4.9→H.4.6 permanecem internas. | Evidência direta dos mecanismos no commit solicitado. `[R-BUILT]` |
| H.4.5 | Notion define task e aceite; as listas explícitas do backlog somam seis restantes e não a enumeram, embora o intervalo H.4.4–H.4.9 a alcance. `[N-H45]` `[R-SCOPE]` | O contexto de H.4.5 integra este packet; sua inclusão no corte de implementação permanece decisão do brainstorming. | Instrução explícita atual decide o conteúdo do packet, sem autorizar decisão de corte. |
| CRUD genérico | ADR-18 ratifica `createCrudResource`; o backlog proíbe CRUD base genérico novo. `[D-ADR]` `[R-SCOPE]` | Preservar o contrato existente e não derivar nova abstração universal. | ADR-18 decide especificamente o contrato existente; o non-goal decide expansão nova. |

## Constraints

- Nenhum item restante depende de trabalho externo ao bloco; H.3.1 não declara dependência. `[N-H31]` `[N-H44]` `[N-H45]` `[N-H46]` `[N-H47]` `[N-H48]` `[N-H49]` `[R-BUILT]`
- Branch `main`, commit solicitado e working tree limpo na geração. `[R-SCOPE]`

## External acceptance signals

- H.3.1: acesso nested cruzado retorna 403/404 e é coberto por integração. `[N-H31]`
- H.4.4: RedatoresTable e StudentsTable usam a moldura, preservando busca, paginação, erro e vazios, sem API universal com flags. `[N-H44]`
- H.4.5: aliases sem valor são eliminados ou justificados; responsabilidades ficam explícitas; nenhum god-hook nasce. `[N-H45]`
- H.4.6: caso real pilotado, service locator removido, payload testado e tipo TS ainda gerado. `[N-H46]`
- H.4.7: multipart/transporte deixam de ser copiados, sem `Content-Type` manual ou invalidação genérica. `[N-H47]`
- H.4.8: gate detecta chave ausente ou excedente e o estado atual passa, sem split físico. `[N-H48]`
- H.4.9: somente repetição comprovada em três cenários é extraída, sem esconder regras nem criar factory por simetria. `[N-H49]`

## Open questions

- Nenhuma bloqueante. O brainstorming deve decidir se H.4.5 integra o corte de implementação; este packet não decide. `[N-H45]` `[R-SCOPE]`

## Deferred

- Corte, ordem, plano e implementação permanecem para brainstorming/spec/plano.

## Staleness triggers

- Mudança semântica no item restante do backlog, nos seus non-goals ou no `active_work_item`.
- Alteração de escopo, aceite, dependência ou status em qualquer uma das sete páginas Notion.
- Novo documento canônico no Drive que delimite ou contradiga este hardening, ou mudança material nos ADRs aplicáveis.
- Decisão posterior de João sobre H.4.5 ou sobre o corte, ou spec/plano aprovado que altere o escopo externo reconciliado.
