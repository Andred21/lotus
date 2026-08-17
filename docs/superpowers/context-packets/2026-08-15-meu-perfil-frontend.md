---
schema_version: 1
packet_id: meu-perfil-frontend-2026-08-15
block_id: meu-perfil-frontend
status: ready
generated_at: 2026-08-15T09:38:14-03:00
base_ref: feat/meu-perfil-frontend
base_commit: 5ff2e7e134d51fc6a8eace7f252c81f9270fbd48
state_path: docs/superpowers/state.md
state_blob_sha: 503d5ca518cd090953dfb4a85b22a2018e2b46ae
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: d2bac2b48402ed2ce7df0d6384c244dbb339204c
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Meu Perfil · frontend

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** entregar a página frontend de Meu Perfil para Admin e Redator, consumindo o contrato self-service já estabilizado: dados pessoais, foto, senha separada e, para Redator, documentos e resumo profissional compatível com os dados realmente fornecidos. `[JOAO][GD-PROFILE][NT-854][NT-855][NT-859]`

**Non-goals:** alterar backend ou regenerar tipos; permitir edição de e-mail, RUT, papel, RBAC, `type` ou `is_active`; criar domínio/feature transversal `Profile`; duplicar listas, filtros, séries, agenda ou central operacional do Dashboard. `[JOAO][GD-PROFILE][LOCAL]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| JOAO | João Victor | instrução atual para `meu-perfil-frontend` | 2026-08-15 | authoritative | Bloco ativo, corte D1, contrato consumidor puro e paralelismo |
| GD-PROFILE | Google Drive | file `1lI3IEOx9_2H093TvhkfO16_hhO9LxFvI` — `meu-perfil-escopo-funcional.md` | 2026-08-14T18:37:45.283Z | retrieved by ID | Escopo frontend, fronteira com Dashboard, estados e DoD |
| NT-DB | Notion | collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | não exposto | retrieved by ID | Confirmar base canônica e linhagem das páginas |
| NT-854 | Notion | EAP 8.5.4 page `3b1bc960-3dfa-8181-a71b-f96b85fbc709` | não exposto; view 2026-08-14T18:40:45.165Z | retrieved by ID | Hook, mutations, invalidation e estado remoto |
| NT-855 | Notion | EAP 8.5.5 page `3b1bc960-3dfa-81e6-914f-ed4f228b1632` | não exposto; view 2026-08-14T18:40:14.707Z | retrieved by ID | Página, diferenças Admin/Redator e aceite funcional |
| NT-859 | Notion | EAP 8.5.9 page `3bcbc960-3dfa-8195-8397-d1581ce0d854` | não exposto; view 2026-08-14T18:40:37.136Z | retrieved by ID | UI review, estados, tema e responsividade |
| LOCAL | Git/repositório | `5ff2e7e134d51fc6a8eace7f252c81f9270fbd48`; tipos, rotas, DTOs, router, menu, rules e backlog | 2026-08-15T09:31:26-03:00 | retrieved; tree clean | Contrato entregue e superfície frontend atual |
| LOCATOR | Git/repositório | `context-packets/2026-08-14-meu-perfil-backend-self-service.md` | 2026-08-14T18:54:11-03:00 | locator only; not evidence | IDs das fontes canônicas |
| DASH | Git/worktree | `/home/jvbat/projetos/lotus`, `feat/dashboard-frontend-central-controle@cfee85c1cca7f9e5af565ba88c1f0c0a6af1e8b1` | 2026-08-15T09:36:15-03:00 | retrieved; tree clean; ready_for_planning | Paralelismo e superfície compartilhada do shell |

## Key facts

1. O bloco é consumidor puro dos tipos e rotas já entregues: `GET/PUT /api/profile`, foto, senha e upload documental; `ProfileUpdateData` contém somente `name` e `phone`. Não há trabalho de backend nem regeneração de `generated.ts`. `[JOAO][LOCAL]`
2. Admin e Redator compartilham cabeçalho, foto, nome/telefone editáveis, e-mail/RUT/papel somente leitura e fluxo separado de senha; somente Redator recebe conteúdo profissional. `[GD-PROFILE][NT-855]`
3. `RedatorProfileDocumentData` fornece sempre quatro slots, `status`, `self_service` e metadados. O frontend consome o status sem recalcular validade e respeita `self_service`; o backend oferece substituição, não remoção, e mantém REUF administrativo. `[GD-PROFILE][LOCAL]`
4. O Drive e a EAP ainda descrevem cursos, atividade atual/próxima e pendências, mas o corte D1 posterior removeu de `RedatorProfileData` tudo que exigiria `Identity → Operation`; o contrato entrega apenas `cursos_habilitados` e `cursos`. `[JOAO][GD-PROFILE][NT-855][LOCAL]`
5. `/perfil` já está no ramo autenticado como `ModulePlaceholder`, e o menu do usuário já navega para ela; o bloco substitui o conteúdo existente, não cria uma nova entrada de navegação. `[LOCAL]`
6. A árvore possui cinco features (`catalog`, `certification`, `commercial`, `identity`, `operation`) e nenhuma `profile` ou `dashboard`; a direção canônica mantém Meu Perfil coerente com Identity/app e proíbe uma feature transversal por conveniência. `[GD-PROFILE][LOCAL]`
7. Queries, mutations e invalidations ficam no hook com TanStack Query; a tela não chama API diretamente e nome/foto atualizados devem refletir no shell/sessão sem segunda fonte manual de verdade. `[GD-PROFILE][NT-854]`
8. O aceite inclui estados distintos de loading, erro, vazio, mutation e sucesso; ES-CL/PT-BR/EN, temas claro/escuro, desktop/mobile e UI review separado para Admin e Redator. `[GD-PROFILE][NT-855][NT-859]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Resumo do Redator | Drive e EAP 8.5.5 incluem cursos, atividade atual/próxima e pendências. `[GD-PROFILE][NT-855]` | Este bloco exibe somente cursos/documentos disponíveis em `ProfileData`; turmas e pendências permanecem no Dashboard até reabertura explícita do corte D1. | A instrução atual do João e o contrato entregue são posteriores e prioritários; o frontend não inventa campos nem reabre `Identity → Operation`. `[JOAO][LOCAL]` |
| Validade documental | Drive §5 determina que validade/idoneidade permanece no backend. `[GD-PROFILE]` | Meu Perfil consome `RedatorProfileDocumentData.status`; não deriva compliance de `valid_until`. | Drive canônico e contrato atual concordam. A linha genérica de `frontend-fsliced.md` é excessiva: o DTO administrativo segue sem status, mas o DTO de perfil já o fornece. `[GD-PROFILE][LOCAL]` |
| Ações documentais | Drive condiciona remoção às regras existentes; EAP fala em gestão dos documentos próprios. `[GD-PROFILE][NT-855]` | Self-service atual permite upload/substituição apenas nos tipos marcados; não existe rota de remoção e REUF não é self-service. | O requisito externo é condicional, e o contrato backend estabilizado materializa a regra aplicável. `[LOCAL][JOAO]` |

## Constraints

- `generated.ts` não é editado nem regenerado; alterações de contrato ou backend estão fora deste bloco. `[JOAO][LOCAL]`
- O Dashboard frontend paralelo está limpo e em `ready_for_planning`; ambas as frentes podem tocar `frontend/src/app/`. A fronteira permanece: Meu Perfil trata identidade/situação imediata, Dashboard trata operação, agenda e pendências aprofundadas. `[JOAO][GD-PROFILE][DASH]`
- Features não importam outras features nem PrimeReact diretamente; estado remoto não vai para Zustand. `[LOCAL]`

## External acceptance signals

- Admin não vê documentos; Redator vê os quatro slots, resumo permitido e CTA funcional para o Dashboard. `[NT-855][NT-859]`
- E-mail, RUT e papel permanecem visualmente somente leitura; senha usa ação/formulário isolado. `[GD-PROFILE][NT-855]`
- Falha de leitura não aparece como vazio; documentos/cursos ausentes e feedback das mutations são distinguíveis. `[GD-PROFILE][NT-859]`
- UI review cobre Admin e Redator, dados, erro, ausência documental, upload, senha, dois temas e desktop/mobile; lint, build e testes pertinentes permanecem verdes. `[NT-859]`

## Open questions

- None blocking.

## Deferred

- Atividade atual/próxima e pendências no Meu Perfil, até o corte D1 ser explicitamente reaberto com contrato disponível.
- Listas completas, agenda, filtros, séries, histórico e central de pendências do Dashboard.
- Qualquer mudança de backend, tipos gerados ou regras administrativas de documentos.

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` mudar semanticamente o escopo deste bloco.
- O Drive ou uma das EAP frontend alterar escopo, aceite, ownership ou a fronteira Meu Perfil × Dashboard.
- Rotas ou tipos de perfil mudarem campos, ações documentais, status semântico ou resumo do Redator.
- O corte D1 ou a decisão de validade no backend ser reaberto.
- O trabalho paralelo do Dashboard alterar semanticamente a fronteira ou a integração compartilhada do shell.
