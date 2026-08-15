---
schema_version: 1
packet_id: dashboard-frontend-central-controle-2026-08-15
block_id: dashboard-frontend-central-controle
status: ready
generated_at: 2026-08-15T09:33:06-03:00
base_ref: feat/dashboard-frontend-central-controle
base_commit: 1a562076af2fa65a2414a1832eadec72e09b8701
state_path: docs/superpowers/state.md
state_blob_sha: 31bc77d71e0b2e88f01e075352acc6425b98d362
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: d2bac2b48402ed2ce7df0d6384c244dbb339204c
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Dashboard · frontend e central de controle

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** substituir o placeholder do Dashboard por uma central operacional e analítica read-only, com composições distintas para Administrativo e Redator, consumindo exclusivamente o contrato agregado entregue pelo bloco A. `[GD-DASH][NT-FE]`

**Non-goals:** mutações no Dashboard; regra de domínio, autorização ou agregação no React; `features/dashboard`; filtros além de período; Notifications; redesign dos módulos de destino; ativação do acesso do Redator. `[GD-DASH]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| GD-DASH | Google Drive | `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa` — `dashboard-escopo-funcional-analitico.md` | 2026-08-14T18:38:17.992Z | retrieved | Escopo canônico, composição por papel, arquitetura frontend, estados, não objetivos e DoD |
| NT-DB | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | não exposto pelo conector | retrieved | Confirmar a base canônica e consultar as EAP por ID |
| NT-FE | Notion | 8.4.4 `3aabc960-3dfa-81d3-a4ed-cd392b000b56`; 8.4.5 `3aabc960-3dfa-8136-a4c6-db9b4219b026`; 8.4.7 `3bcbc960-3dfa-811c-8223-e910c453f3bc` | não exposto; `createdTime` 2026-07-27/2026-08-14 | retrieved | Sequência, descrição e aceite das tasks frontend |
| NT-SWAP | Notion | 8.4.0 `3bcbc960-3dfa-81c8-9df1-de7d7805816b`; 8.4.7 `3bcbc960-3dfa-811c-8223-e910c453f3bc` | não exposto; `createdTime` 2026-08-14T17:06:30Z | retrieved | Verificar se a troca de corpos persiste |

## Key facts

1. O Dashboard prioriza ação imediata, riscos, estado operacional e evolução histórica; não é uma coleção genérica de gráficos. `[GD-DASH]`
2. A composição permanece em `app`: não criar `features/dashboard`. A página usa TanStack Query contra `GET /api/dashboard/metricas`; apresentação, layout e interação ficam no frontend, enquanto agregação, classificação, ownership e autorização permanecem no backend. `[GD-DASH]`
3. A sequência frontend é EAP 8.4.4 → 8.4.5 → 8.4.7: hook tipado com cache por filtro, central visual por papel e validação UI/UX. `[NT-FE]`
4. A visão administrativa combina KPIs, pendências, alertas, pipeline, agenda, séries, compliance, carga de redatores e rankings somente conforme os datasets autorizados recebidos. `[GD-DASH][NT-FE]`
5. A visão do Redator é um painel profissional separado: somente suas turmas, agenda, pendências documentais, compliance próprio e histórico resumido; dados comerciais, financeiros, de terceiros e payload administrativo são proibidos. `[GD-DASH][NT-FE]`
6. O filtro frontend do MVP é somente período. Estado operacional atual não deve aparentar obedecer ao filtro histórico; seções anuláveis por gate devem ser diferenciadas de coleções legitimamente vazias conforme o contrato local. `[GD-DASH]`
7. Loading, erro, vazio real, dados parciais e dados normais são estados distintos; falha de GET nunca aparece como zero ou “sem dados”. A entrega cobre ES-CL, PT-BR, EN, temas claro/escuro, desktop/mobile e UI review. `[GD-DASH][NT-FE]`
8. CTAs apenas navegam ao módulo dono. Meu Perfil gerencia identidade e documentos; o Dashboard concentra operação e pode navegar para o Perfil sem duplicar upload ou edição. `[GD-DASH]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| EAP 8.4.0 × 8.4.7 | A troca persiste: 8.4.0 ainda contém descrição/aceite de UI review, enquanto 8.4.7 contém domínio backend e `DomainDependencyTest`, apesar de títulos, camadas e ADRs corretos. `[NT-SWAP]` | A UI review pertence a este bloco frontend; os corpos trocados não definem seu aceite. | O Drive atribui explicitamente validação visual ao bloco B e prevalece sobre o Notion organizacional. `[GD-DASH][NT-SWAP]` |
| Localização frontend | O Drive determina composição transversal na camada `app` e proíbe `features/dashboard`. `[GD-DASH]` | Manter o Dashboard em `app` e substituir o placeholder existente. | Fonte canônica explícita; não resta decisão arquitetural externa em aberto. `[GD-DASH]` |

## Constraints

- O contrato local é `docs/superpowers/specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md` §4.2 e `frontend/src/shared/types/generated.ts`: dois DTOs raiz discriminados por `view`, com nulabilidade de gates já estabilizada.
- `generated.ts` é gerado pelo backend e não pode ser editado manualmente.
- A árvore estava limpa; nenhuma alteração local ou externa foi realizada.
- O acesso produtivo do Redator continua inativo, mas sua composição e suas provas permanecem no escopo; ativá-lo é trabalho separado.
- A UI review final depende do passo manual registrado em `docs/superpowers/state.md`.

## External acceptance signals

- Hook tipado, query key variando pelo período e estados loading/error/empty explícitos, sem reconstrução de regra ou filtro de segurança por papel. `[NT-FE]`
- Administrativo e Redator recebem composições distintas, coerentes com seus payloads; nenhum dado comercial, financeiro ou de terceiros aparece para Redator. `[GD-DASH][NT-FE]`
- KPIs, pendências, alertas, pipeline, séries e vazios usam dados reais; i18n, temas e responsividade são verificados. `[GD-DASH]`
- UI review sem falhas bloqueantes de hierarquia, leitura, overflow ou estados, com lint, build e testes pertinentes verdes. `[NT-FE]`

## Open questions

- Escolher na spec a visualização e a prioridade exatas de cada dataset dentro da hierarquia recomendada; o Drive delega essa decisão de apresentação ao frontend. `[GD-DASH]`
- Mapear os campos de navegação do contrato para rotas/CTAs existentes sem redesenhar os módulos de destino. `[GD-DASH]`

## Deferred

- Notifications persistentes, inbox, e-mail, WebSocket e abstrações antecipadas específicas dessa evolução. `[GD-DASH]`
- Tempos de ciclo, ranking de redatores, séries próprias do Redator e filtros adicionais.
- Ativação de autenticação do Redator e a decisão D-16 permanecem fora desta promoção.

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` mudar semanticamente para outro escopo.
- O Drive ou as EAP 8.4.4, 8.4.5 e 8.4.7 alterarem escopo, aceite, papéis ou sequência.
- A troca entre EAP 8.4.0 e 8.4.7 ser corrigida ou alterada de modo relevante.
- O endpoint, os DTOs gerados, a nulabilidade dos gates ou as regras de payload por papel mudarem.
- A decisão de manter a composição em `app` ou outra resolução desta tabela ser reaberta.
