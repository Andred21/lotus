---
schema_version: 1
packet_id: dashboard-backend-agregacoes-2026-08-14
block_id: dashboard-backend-agregacoes
status: ready
generated_at: 2026-08-14T17:10:34-03:00
base_ref: main
base_commit: a3833e08bb463c2170037516dbc09f7a54633afe
state_path: docs/superpowers/state.md
state_blob_sha: 83f80284b58e5b8c22d74433ac6544745434bd19
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 3ebd88e7e211278c99722ccb10dc6a6943612c10
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Dashboard · backend e agregações

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** estabilizar o contrato backend read-only do Dashboard: domínio próprio, DTOs, consultas cross-domain, agregações, filtros, endpoint, RBAC/ownership e testes, entregando projeções distintas e seguras para Administrativo e Redator. `[GD-DASH][NT-EAP]`

**Non-goals:** frontend do Dashboard; qualquer mutação; schema, Model ou tabela próprios; cache sem medição; data warehouse; reconstrução histórica as-of; sistema de Notifications; redesign dos módulos de destino. `[GD-DASH]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| GD-DASH | Google Drive | `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa` — `dashboard-escopo-funcional-analitico.md` | 2026-08-14T18:38:17.992Z | retrieved | Escopo canônico, arquitetura, papéis, métricas, não objetivos e DoD |
| NT-DB | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | não exposto pelo conector | retrieved | Confirmar a base canônica e seu schema |
| NT-EAP | Notion | EAP 8.4.0 `3bcbc960-3dfa-81c8-9df1-de7d7805816b`; 8.4.1 `3aabc960-3dfa-812b-9a63-d302ef93f44a`; 8.4.2 `3aabc960-3dfa-8158-95d9-e9377665fe42`; 8.4.3 `3aabc960-3dfa-819a-9aa6-f6ec245867a0`; 8.4.4 `3aabc960-3dfa-81d3-a4ed-cd392b000b56`; 8.4.5 `3aabc960-3dfa-8136-a4c6-db9b4219b026`; 8.4.6 `3aabc960-3dfa-81c3-ba69-f8fdc5b4c925`; 8.4.7 `3bcbc960-3dfa-811c-8223-e910c453f3bc` | não exposto; `createdTime` 2026-07-27/2026-08-14 | retrieved | Sequência, dependências e critérios das tasks 8.4.0–8.4.7 |
| NT-840 | Notion | página `3bcbc960-3dfa-81c8-9df1-de7d7805816b` — EAP 8.4.0 | não exposto; snapshot as of 2026-08-14T18:39:29.590Z | retrieved | Verificar divergência interna de descrição/aceite |
| NT-847 | Notion | página `3bcbc960-3dfa-811c-8223-e910c453f3bc` — EAP 8.4.7 | não exposto; snapshot as of 2026-08-14T18:38:40.469Z | retrieved | Verificar divergência interna de descrição/aceite |

## Key facts

1. `App\Domains\Dashboard` é um domínio read-only sem entidade, Model, migration ou tabela; consultas cross-domain não pertencem a `App\Shared`, e as novas arestas devem ser declaradas no `DomainDependencyTest`. `[GD-DASH]`
2. O endpoint previsto é `GET /api/dashboard/metricas`; ele entrega contagens, somatórios, séries, classificações, pendências e alertas sem configuração visual, e DTOs `spatie/laravel-data` geram os tipos TypeScript oficiais. `[GD-DASH][NT-EAP]`
3. A projeção administrativa é global dentro das permissões; valores em UF e dados comerciais só aparecem quando autorizados. A projeção do Redator contém exclusivamente suas turmas, agenda, pendências, documentos e histórico aprovado, sem dados comerciais, financeiros, de terceiros ou payload administrativo ocultado depois no React. `[GD-DASH][NT-EAP]`
4. O núcleo operacional cobre quatro KPIs, pendências do ciclo Cotação→Turma→Documentação→Conclusão→Certificação, pipeline não ambíguo, agenda, compliance de turmas/redatores e riscos de atraso ou vencimento. `[GD-DASH]`
5. Séries e rankings obedecem ao período e à data de negócio correta; KPIs, pendências, riscos e pipeline representam o estado atual e não devem ser alterados silenciosamente pelo filtro histórico. `[GD-DASH]`
6. Ownership e filtros são aplicados antes da agregação no backend; consultas representativas não podem introduzir N+1 nem exigir `reduce`, agrupamentos ou regras de autorização no frontend. `[GD-DASH][NT-EAP]`
7. A sequência backend organizacional é EAP 8.4.0→8.4.1→8.4.2→8.4.3→8.4.6; EAP 8.4.4, 8.4.5 e 8.4.7 pertencem ao bloco frontend posterior. `[NT-EAP]`
8. Dashboard não executa mutações. Alertas e pendências são projeções read-only, não notificações persistentes; Notifications é evolução futura e não requisito desta sprint. `[GD-DASH]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| EAP 8.4.0 × 8.4.7 | Os títulos, camadas e ADRs apontam 8.4.0 para domínio backend e 8.4.7 para validação frontend, mas suas descrições e critérios de aceite estão trocados. `[NT-840][NT-847]` | Usar o Drive para o escopo: domínio/dependências no bloco backend; UI review no bloco frontend. Não importar os campos trocados como aceite deste bloco. | Drive é canônico e superior ao Notion organizacional; a inconsistência foi confirmada pelos IDs das duas páginas. `[GD-DASH][NT-840][NT-847]` |
| Notifications | O Drive descreve uma evolução futura reutilizando projeções do Dashboard. `[GD-DASH]` | Nenhuma capacidade de Notification entra na Sprint 5; não antecipar abstrações específicas. | Instrução explícita atual e as seções de fora de escopo/evolução futura do próprio Drive. `[GD-DASH]` |

## Constraints

- DDD-lite sem Repository sobre Eloquent; erros de filtros inválidos seguem RFC 7807. `[CLAUDE.md §5]`
- Financeiro é informativo e nunca bloqueia emissão ou outra ação do workflow. `[CLAUDE.md §5][GD-DASH]`
- A árvore estava limpa em `main`; nenhuma alteração local foi realizada.
- `active_spec` e `active_plan` eram `null`; nenhuma semântica foi inferida deles.

## External acceptance signals

- Domínio sem escrita/schema próprio e dependências cross-domain conscientemente cobertas pelo teste arquitetural. `[GD-DASH][NT-EAP]`
- Endpoint autenticado, controller fino, filtros inválidos em Problem Details e payload seguro por papel/ownership. `[NT-EAP]`
- Testes provam valores agregados, vazio, filtros, Administrativo, Redator, ausência de vazamento e ausência de N+1. `[GD-DASH][NT-EAP]`
- Contrato tipado independente de biblioteca visual e tipos TypeScript regenerados pelo mecanismo oficial. `[GD-DASH][NT-EAP]`

## Open questions

- Não bloqueantes para planejamento: semântica e janelas exatas dos KPIs; filtros MVP além de período; fórmulas dos tempos de ciclo. `[GD-DASH]`
- Definir na spec a superfície pública cross-domain e a granularidade dos contratos por papel. `[GD-DASH]`
- Decidir se ranking de redatores e séries próprias do Redator entram no MVP. `[GD-DASH]`

## Deferred

- Hook, central visual e UI review das EAP 8.4.4, 8.4.5 e 8.4.7, somente após o fechamento do backend. `[GD-DASH][NT-EAP]`
- Notifications persistentes, inbox, e-mail, WebSocket, data warehouse e métricas sem base confiável. `[GD-DASH]`

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` mudar semanticamente para outro escopo.
- O documento canônico do Drive ou as tasks EAP 8.4.0–8.4.7 mudarem escopo, aceite, papéis ou ownership.
- A troca de conteúdo entre EAP 8.4.0 e 8.4.7 ser corrigida de modo que altere a reconciliação registrada.
- Código relevante mudar as superfícies públicas cross-domain, semânticas de status/datas ou regras RBAC/ownership usadas pelas agregações.
- Uma decisão da tabela de divergências ser reaberta.
