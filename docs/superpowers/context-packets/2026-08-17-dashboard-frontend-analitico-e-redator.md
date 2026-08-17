---
schema_version: 1
packet_id: dashboard-frontend-analitico-e-redator-2026-08-17
block_id: dashboard-frontend-analitico-e-redator
status: ready
generated_at: 2026-08-17T12:37:46-03:00
base_ref: feat/dashboard-frontend-analitico-e-redator
base_commit: e48b4aebedc02ad3a4dfa75bf82e303a305ac4ff
state_path: docs/superpowers/state.md
state_blob_sha: 98f93dac8e45ae8f64447e8a4e7f5c448c606bb9
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 04ded854f8433d0fc18591e09265bef220de8bb6
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Dashboard · frontend analítico e view do Redator

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** entregar o B2 read-only: apresentação das séries, rankings, compliance de turmas, carga de redatores e toda a composição do Redator, consumindo o contrato agregado existente. `[GD-DASH][NT-845]`

**Non-goals:** reimplementar KPIs, pendências, alertas, agenda ou pipeline já entregues no B1; regra de domínio/agregação/autorização no React; ativação de acesso do Redator; limpeza do banco de dev; D-16; Notifications, filtros adicionais ou tempos de ciclo.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| GD-DASH | Google Drive | ID `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa` — `dashboard-escopo-funcional-analitico.md` | 2026-08-14T18:38:17.992Z | retrieved | Escopo analítico, período, apresentação, view do Redator e DoD |
| NT-844 | Notion | 8.4.4, page `3aabc960-3dfa-81d3-a4ed-cd392b000b56`; parent `collection://e64b7d57-d000-4433-b652-a410e75193cc`, database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | não exposto; snapshot 2026-08-14T18:39:14.058Z | retrieved | Hook, filtros, cache e estados |
| NT-845 | Notion | 8.4.5, page `3aabc960-3dfa-8136-a4c6-db9b4219b026`; mesma collection/database canônica | não exposto; snapshot 2026-08-14T18:39:21.304Z | retrieved | Central analítica e composições por papel |
| NT-SWAP | Notion | 8.4.0 page `3bcbc960-3dfa-81c8-9df1-de7d7805816b`; 8.4.7 page `3bcbc960-3dfa-811c-8223-e910c453f3bc`; mesma collection/database canônica | não exposto; snapshots 2026-08-14T18:39:29.590Z / 18:38:40.469Z | retrieved | Revalidar a inversão de corpos |
| PKT-A | Repository | `docs/superpowers/context-packets/2026-08-14-dashboard-backend-agregacoes.md`; blob `3de434379b91528824ae072cbfb3fcc9515503fa` | 2026-08-14T17:13:10-03:00 | retrieved | Evitar repetir o contexto backend |
| PKT-B1 | Repository | `docs/superpowers/context-packets/2026-08-15-dashboard-frontend-central-controle.md`; blob `2fdfdaefec614998c9321ba303995ab52e742baf` | 2026-08-15T09:36:15-03:00 | retrieved | Delimitar o contexto frontend anterior |

## Key facts

1. O B2 é a metade restante da D1 do B1: cinco séries mensais, dois rankings, `compliance_turmas`, carga de redatores e a view do Redator inteira; não reabre as cinco seções operacionais. `docs/superpowers/specs/archive/2026-08-15-dashboard-frontend-central-controle-design.md:16`
2. A EAP 8.4.4 exige hook tipado, cache variando pelos filtros e estados explícitos; a 8.4.5 exige composições distintas para Administrativo e Redator, sem regra de domínio nem ocultação de payload administrativo no frontend. `[NT-844][NT-845]`
3. As cinco séries são `turmas_iniciadas`, `turmas_concluidas`, `certificados_emitidos`, `matriculas` e `uf_aprovada`; usam a data de negócio correta, e cada série pode faltar por gate no contrato local. `[GD-DASH]`
4. Os rankings são `courses` e `clients`, por turmas, matrículas, certificados e UF autorizada; o Drive admite linha, barras e ranking/Pareto, mas não fixa uma visualização por dataset e desencoraja gauges e excesso de pizza. `[GD-DASH]`
5. A D3 local fixa que o filtro temporal afeta somente séries e rankings; `compliance_turmas`, carga de redatores e toda leitura operacional permanecem estado atual. `docs/superpowers/specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md:28`
6. `compliance_turmas` mostra presença/ausência documental, habilitação, responsáveis e datas; `redatores` mostra carga atual/próxima e documentos vencidos/vencendo. `[GD-DASH]`
7. A view do Redator é um painel profissional próprio: resumo, agenda/minhas turmas, pendências documentais, alertas dos próprios documentos e histórico resumido; proíbe Comercial, UF, clientes globais, terceiros e turmas alheias, e navega ao Meu Perfil para editar documentos. `[GD-DASH][NT-845]`
8. O aceite externo distingue loading, erro, vazio real, parcial e normal; cobre ES-CL/PT-BR/EN, claro/escuro, desktop/mobile e UI review, com ownership e ausência de vazamento para Redator. `[GD-DASH][NT-845]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| EAP 8.4.0 × 8.4.7 | A inversão persiste: 8.4.0 mantém corpo/aceite de UI review; 8.4.7 mantém domínio backend e `DomainDependencyTest`, embora títulos, camadas e ADRs estejam corretos. `[NT-SWAP]` | UI review pertence ao frontend; não importar o corpo de 8.4.7 como aceite backend deste B2. | O Drive é canônico e inclui UI review no DoD frontend. `[GD-DASH][NT-SWAP]` |
| EAP 8.4.5 × corte B1/B2 | A task descreve a central inteira, operacional e analítica, para ambos os papéis. `[NT-845]` | B1 já entregou as cinco seções operacionais; B2 entrega somente o restante analítico e a view completa do Redator. | D1 posterior escolhida pelo João e a instrução explícita atual refinam a unidade de execução sem reduzir o DoD da sprint. |
| Alcance do período | O Drive chama o filtro de global para datasets históricos e separa estado atual de análise histórica. `[GD-DASH]` | A D3 local fixa exclusivamente séries e rankings; os demais datasets ignoram o período. | Decisão posterior explícita em `docs/superpowers/specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md:28`. |

## Constraints

- Não existe chart lib instalada nem wrapper em `frontend/src/shared/ui`; escolher biblioteca, wrapper e mapeamento visual é decisão deste bloco.
- `frontend/src/app/pages/Dashboard/useDashboard.ts` já aceita `DashboardPeriod`, inclui start/end na query key e envia `period_start`/`period_end`; a página ainda o chama sem período.
- `AdminDashboardData` torna `compliance_turmas`, `redatores`, `series` e `rankings` anuláveis; dentro de `SeriesData`, cada uma das cinco séries também é anulável, e `RankingRowData.uf_aprovada` pode ser `null`.
- `RedatorDashboardData` tem seis chaves e suas cinco seções não são anuláveis.
- Nenhum Redator autentica hoje: `CreateRedatorAction.php:20` mantém `is_active=false` e `AuthController.php:52` recusa inativo. O aceite da view limita-se a payload/ownership e render; ativação real não entra.
- P-44 permanece: dois usuários-sonda aparecem na carga de redatores. Não apagá-los neste bloco; limpeza/reseed é decisão separada.
- `backend/config/cors.php` é WIP preexistente e fica intocado. `active_plan` e `active_spec` são `null`.

## External acceptance signals

- As cinco séries e os dois rankings usam dados reais, comunicam ausência autorizada sem convertê-la em zero e respondem ao período sem alterar as demais seções. `[GD-DASH][NT-844]`
- Compliance e carga exibem somente datasets autorizados; UF degrada sem vazamento quando o gate comercial faltar. `[GD-DASH]`
- A composição completa do Redator renderiza exclusivamente o contrato `view=redator`, com ownership e navegação ao Meu Perfil, sem mutação local. `[GD-DASH][NT-845]`
- Loading/erro/vazio/parcial/normal, três locales, dois temas, responsividade e UI review ficam provados. `[GD-DASH][NT-845]`

## Open questions

- Qual biblioteca/wrapper de gráficos e qual visualização aplicar a cada série e ranking, preservando acessibilidade e leitura em mobile?
- Qual UX do seletor de período — intervalo livre, presets e default — sobre os parâmetros já estabilizados?

## Deferred

- Ativação/entrega de credencial do Redator e prova com sessão real.
- Limpeza ou reseed dos usuários-sonda da P-44.
- Séries próprias adicionais do Redator além do `historico` atual, filtros além de período, tempos de ciclo, Notifications e D-16.

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` mudar semanticamente de escopo.
- O Drive ou as EAP 8.4.4/8.4.5/8.4.7 alterarem escopo, aceite, papéis ou sequência.
- A inversão 8.4.0 × 8.4.7 ser corrigida ou a decisão do corte B1/B2 ser reaberta.
- `generated.ts` ou `useDashboard` mudar séries, rankings, nulabilidade, payload por papel ou contrato de período.
- Uma chart lib/wrapper ser introduzida, o acesso do Redator ser ativado ou a P-44 deixar de existir.
