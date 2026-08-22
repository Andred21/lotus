---
schema_version: 1
packet_id: 2026-08-22-bd15-docs-guardrails-e-sincronizacao
block_id: BD-15-docs-guardrails-e-sincronizacao
status: ready
generated_at: 2026-08-22T03:48:30-03:00
base_ref: docs/bd15-guardrails-e-sincronizacao
base_commit: e93225fc8146a3734ac0627cce36045d682a7970
state_path: docs/superpowers/state.md
state_blob_sha: 0f32ac293b20cbe98f2ea7fb8bd73564b552169e
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 0457320abea178668c65112513c37fc45dcbb281
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — BD-15 · Docs: guardrails e sincronização

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** fornecer ao planejamento o estado medido de Drive e Notion necessário para reconciliar `P-20`, `P-21`, `P-23`, `P-31`, `P-32`, `P-39`, `P-43`, `P-18`, `P-22`, `D-17` e a sincronização obrigatória do Notion.

**Non-goals:** brainstorm, desenho de solução, passos de implementação, escrita no repositório/Drive/Notion, avanço do workflow, retroedição de planos históricos ou reimplementação de features entregues. A árvore estava limpa na geração.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| REPO-STATE | Git | `docs/superpowers/state.md`, blob `0f32ac293b20cbe98f2ea7fb8bd73564b552169e` | snapshot `e93225fc8146a3734ac0627cce36045d682a7970` | retrieved | bloco, etapa e proveniência |
| REPO-SCOPE | Git | `docs/superpowers/backlog.md` §14; fichas citadas em `docs/superpowers/pendencias/`; D-17 no backlog | snapshot `e93225fc8146a3734ac0627cce36045d682a7970` | retrieved | escopo, restrições e estado entregue |
| DRIVE-ADR16 | Google Drive | `decisao-stack.md`, file ID `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`; cadeia verificada `Viagem Chile/Projetos/Lotus.cl/V2/Planejamento/3-avancado` por IDs | 2026-07-31T16:15:51.504Z | retrieved | estado canônico do ADR-16 |
| NOTION-CANON | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc`, database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | não exposto pelo conector; lido em 2026-08-22 | retrieved | IDs, status e propriedades atuais |
| NOTION-P18-OLD | Notion | page `f88bc9603dfa8253b40981686f8ae023`, parent `collection://6adbc960-3dfa-8269-9d57-8719e44eed2c` | snapshot 2026-07-20T21:14:05.977Z | retrieved; deleted | comprovar que o ID da ficha P-18 pertence à base obsoleta |

## Key facts

1. O escopo local é exatamente o item 14 e suas dez frentes; `active_plan` e `active_spec` são nulos. `[REPO-STATE]` `[REPO-SCOPE]`
2. O Drive ainda contém o ADR-16 anterior: Tailwind para layout, tema PrimeReact via `<link>`, trade-off de especificidade e alternativa `unstyled`; não contém o ponto 5 nem a revogação da exceção de shell registrada pela P-31. `[DRIVE-ADR16]`
3. `8.4.0`–`8.4.7` estão todos `Backlog`, embora o Dashboard esteja entregue; os conteúdos de `8.4.0` e `8.4.7` continuam trocados entre estrutura arquitetural e UI review. `[NOTION-CANON]` `[REPO-SCOPE]`
4. `8.5.1`–`8.5.9` estão todos `Backlog`, embora Meu Perfil esteja entregue. `[NOTION-CANON]` `[REPO-SCOPE]`
5. `9.1.4` está `A fazer`; o escopo local registra que a `main` já tem as três coberturas dedicadas e proíbe abrir novo bloco de código para repeti-las. `[NOTION-CANON]` `[REPO-SCOPE]`
6. A P-18 cita uma página apagada da base obsoleta; na base canônica, a página equivalente é `3a2bc9603dfa8067902cf3c62bffdb0d`, `Concluída`, e ainda diverge internamente: descrição Sprint 3, propriedade Sprint 2. `[NOTION-P18-OLD]` `[NOTION-CANON]`
7. A duplicação P-22 persiste: as duas páginas H.1.3.1 estão `Backlog`; as demais duplicações genéricas de sync, fechamento e UI/UX também permanecem na base. `[NOTION-CANON]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| ADR-16 | Drive não possui o ponto 5 | Tratar o Drive como ainda não sincronizado; não presumir o ponto 5 externo | `[DRIVE-ADR16]` + escopo explícito `[REPO-SCOPE]` |
| Dashboard | oito páginas `Backlog` | Entregue; divergência é de sincronização, não autorização para reimplementar | instrução explícita e `[REPO-SCOPE]` prevalecem sobre organização Notion |
| Meu Perfil | nove páginas `Backlog` | Entregue; divergência é de sincronização | instrução explícita e `[REPO-SCOPE]` |
| 9.1.4 | `A fazer` | Cobertura já existe; não criar bloco de código duplicado | instrução explícita e `[REPO-SCOPE]` |
| P-18 | ID da ficha é apagado/obsoleto | Usar o ID canônico `3a2bc9603dfa8067902cf3c62bffdb0d`; a propriedade Sprint continua divergente | coleção canônica explícita `[NOTION-CANON]` |
| P-22 | duas páginas canônicas `Backlog` | Para consumo, manter o ID já fixado na ficha; merge/exclusão permanece decisão do João | `[REPO-SCOPE]` + medição `[NOTION-CANON]` |
| Duplicações genéricas | páginas repetem operações do workflow | São sincronização documental, não novos blocos de produto | escopo explícito `[REPO-SCOPE]` |

## Constraints

- A ficha da P-32 veta desenhar seletor por classe sem reincidência medida ou decisão explícita do João Victor (falso-positivo caro — a doc cita classe de vendor, classe planejada e nome de conceito).
- A P-39 não autoriza retroeditar o plano histórico do BD-6.
- Fonte externa deve ser referenciada por ID, nunca por título.
- Este packet não autoriza escrita externa nem mudança de workflow.

## External acceptance signals

**Dashboard — todos `Backlog`** `[NOTION-CANON]`

| EAP | Page ID |
|---|---|
| 8.4.0 | `3bcbc9603dfa81c89df1de7d7805816b` |
| 8.4.1 | `3aabc9603dfa812b9a63d302ef93f44a` |
| 8.4.2 | `3aabc9603dfa815895d9e9377665fe42` |
| 8.4.3 | `3aabc9603dfa819a9aa6f6ec245867a0` |
| 8.4.4 | `3aabc9603dfa81d3a4edcd392b000b56` |
| 8.4.5 | `3aabc9603dfa8136a4c6db9b4219b026` |
| 8.4.6 | `3aabc9603dfa81c3ba69f8fdc5b4c925` |
| 8.4.7 | `3bcbc9603dfa811c8223e910c453f3bc` |

**Meu Perfil — todos `Backlog`** `[NOTION-CANON]`

| EAP | Page ID |
|---|---|
| 8.5.1 | `3b1bc9603dfa8148b646d019ff354623` |
| 8.5.2 | `3b1bc9603dfa81968ff1f2802994cc13` |
| 8.5.3 | `3b1bc9603dfa8181a39df34752c1b98f` |
| 8.5.4 | `3b1bc9603dfa8181a71bf96b85fbc709` |
| 8.5.5 | `3b1bc9603dfa81e6914fed4f228b1632` |
| 8.5.6 | `3bcbc9603dfa8137a7f3df9ab8df33e5` |
| 8.5.7 | `3bcbc9603dfa8123bb33f91532f6b38b` |
| 8.5.8 | `3bcbc9603dfa81c79018d783e2fe73c7` |
| 8.5.9 | `3bcbc9603dfa81958397d1581ce0d854` |

**Outros itens medidos** `[NOTION-CANON]`

- `9.1.4` — `388bc9603dfa8119a5ecc157b2cc18d3` — `A fazer`.
- P-18 canônica/H.1.3.2 Sprint 2 — `3a2bc9603dfa8067902cf3c62bffdb0d` — `Concluída`.
- P-22/H.1.3.1 Sprint 3 — `3a2bc9603dfa8021b69ee399cd8fd915` — `Backlog`.
- P-22/H.1.3.1 Sprint 4 — `3a2bc9603dfa803b94bbf27c075b27d6` — `Backlog`.

**Duplicações genéricas do workflow** `[NOTION-CANON]`

- Templates: H.1.1 `39dbc9603dfa8190b088da6160d84056` — `Backlog`; H.1.2 `39dbc9603dfa81c8b75ad5207a8b4a2c` — `Backlog`; H.2.1 `39dbc9603dfa8180937cd9a86a8c6f0c` — `Backlog`.
- Sprint 1: H.1.1 `3a2bc9603dfa809e9510d1ade4ffa29a` — `Concluída`; H.1.2 `3a2bc9603dfa809abf8ee3a83e4ef397` — `Concluída`.
- H.1.3 UI/UX: Sprint 1 `3a2bc9603dfa8059abdde0230ad8e196` — `Concluída`; Sprint 2 `3a2bc9603dfa8040800ff130c996ad51` — `Concluída`; Sprint 3 `3a2bc9603dfa80c3987ae806daf5c494` — `Concluída`; Sprint 4 `3a2bc9603dfa8083bacffcd467cb7127` — `Backlog`; Sprint 7 `3a2bc9603dfa803cb84efebc07021a00` — `Backlog`.
- H.1.3.1 sync: Sprint 2 `3a2bc9603dfa80fc90ebf19526b587c9` — `Concluída`; Sprint 3 `3a2bc9603dfa8021b69ee399cd8fd915` — `Backlog`; Sprint 4 `3a2bc9603dfa803b94bbf27c075b27d6` — `Backlog`; Sprint 7 `3a2bc9603dfa804dbb55eb5b20b8040e` — `Backlog`.
- H.1.3.2 fechamento: Sprint 2 `3a2bc9603dfa8067902cf3c62bffdb0d` — `Concluída`; Sprint 3 `3a2bc9603dfa8028a1fbf8a3863690ed` — `Concluída`; Sprint 4 `3a2bc9603dfa8045abbdec64eb780e2c` — `Backlog`; Sprint 7 `3a2bc9603dfa8025ae21c5bdfe74d6db` — `Backlog`.

## Open questions

- P-20: ADR hospedeiro do OpenSpout ou autorização de ADR-20.
- P-23: restaurar a coluna `Contexto` ou declarar formalmente o formato novo.
- P-18: corrigir a propriedade Sprint da página canônica.
- P-22: apagar ou mesclar uma das duas páginas. Nenhuma destas questões bloqueia o planejamento.

## Deferred

- Seletor por classe da P-32, enquanto não houver reincidência medida ou decisão explícita.
- Qualquer reimplementação de Dashboard, Meu Perfil, `9.1.4` ou operações genéricas já pertencentes ao workflow.

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` mudar de escopo.
- O item 14 ou alguma ficha citada mudar escopo, restrição ou decisão.
- O arquivo Drive `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` ganhar o ponto 5 ou contradizer esta medição.
- IDs, status, Sprint ou duplicações relevantes mudarem na coleção Notion canônica.
