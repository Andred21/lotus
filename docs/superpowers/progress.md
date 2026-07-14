# Progresso — Lotus v2

Índice vivo do projeto. **Uma linha por feature.** Sessão nova lê este arquivo primeiro
para reconstruir contexto antes de qualquer plano/spec.

- **Ativo** = feature em desenvolvimento; plano/spec em `plans/` e `specs/`.
- **Entregue** = mergeado e provado; plano/spec movidos para `plans/archive/` e `specs/archive/`.
- Detalhe de decisões: `docs/adrs.md`. Estado do schema: `docs/der-fisico.md`.

| Data | Feature | Status | Resultado (1 linha) | Plano | Spec |
|------|---------|--------|---------------------|-------|------|
| 2026-07-04 | Login + store de sessão | Entregue | Auth SPA Sanctum, guard de rota, sessão em Zustand hidratada no boot | `plans/archive/2026-07-04-login-flow-session.md` | `specs/archive/2026-07-04-login-flow-session-design.md` |
| 2026-07-06 | App Shell + Sidebar RBAC | Entregue | Shell (sidebar+header), nav filtrada por RBAC, dark mode layout-only em uiStore | `plans/archive/2026-07-06-app-shell-sidebar.md` | — |
| 2026-07-07 | Sprint 1 · Cadastros backend (Cliente + Redator) | Entregue | Schema, models, DTOs, validação RUT, actions, controllers; provado em sqlite `:memory:` | `plans/archive/2026-07-07-sprint1-cadastros-backend.md` | `specs/archive/2026-07-07-sprint1-cadastros-backend-design.md` |
| 2026-07-08 | Sprint 1 · Cursos backend | Entregue | `courses` + `course_certificate_templates` + `course_redator` (N:N habilitação) | `plans/archive/2026-07-08-sprint1-cadastros-cursos-backend.md` | — |
| 2026-07-09 | Frontend · Fundação da UI | Entregue | Molde reutilizável: ModulePage, CrudDialog, useCrudPage, useEntityForm, i18n, tema dark | `plans/archive/2026-07-09-frontend-fundacao-ui.md` | — |
| 2026-07-09 | Sprint 1 · Cadastros frontend + docs tipados | Entregue | Telas Cliente/Redator sobre hooks CRUD; documentos tipados do redator no backend | `plans/archive/2026-07-09-sprint1-cadastros-frontend.md` | `specs/archive/2026-07-09-sprint1-cadastros-frontend-design.md` |
| 2026-07-09 | Sprint 1 · Correções code-review | Entregue | 7 defeitos do review corrigidos; build verde, comportamento provado por teste | `plans/archive/2026-07-09-sprint1-correcoes-code-review.md` | — |
| 2026-07-10 | Sprint 1 · Catálogo frontend | Entregue | `/cursos`: listagem + form com habilitação de redatores (fecha Sprint 1) | `plans/archive/2026-07-10-sprint1-catalog-frontend.md` | `specs/archive/2026-07-10-sprint1-catalog-frontend-design.md` |
| 2026-07-10 | Sprint 2 · Comercial backend | Entregue | Budget agrupa Quotes independentes; status/totais derivados (bcmath); aprovação superadmin; anexos polimórficos. ADR-17 (seq atômica) nasceu aqui | `plans/archive/2026-07-10-sprint2-commercial-backend.md` | `specs/archive/2026-07-10-sprint2-commercial-backend-design.md` |
| 2026-07-13 | Sprint 2 · Comercial frontend | Entregue | Lista de orçamentos, detalhe com cotações, wizard de cotação (passo em useState), aprovação/recusa, anexos | `plans/archive/2026-07-13-sprint2-commercial-frontend.md` | `specs/archive/2026-07-13-sprint2-commercial-frontend-design.md` |
| 2026-07-14 | Bloco 0 · Sync de docs pós-Sprint 2 | Entregue | Docs voltam a bater com o código: `budgets` **sem** status/total (derivados no `BudgetSummaryService`) e `quotes` **sem** `client_id` — não recriar essas colunas na Sprint 3. ADR-17 fechado; ressalva do ADR-18 (cliente REST em `shared/api`). Morph map mantém o alias `turma` antes do model — intencional, não remover | — (docs-only, sem plano) | — |

## Backlog (títulos dos próximos blocos — sem plano detalhado ainda)

_Planejamento just-in-time: só escrever o plano/spec quando o bloco entrar em execução._

- Refino de código Sprint 2 (kit de form em shared/ui; DeleteBudget/DeleteQuote Action) — Notion 6.4.x
- Módulo Administração (Usuários, Roles/Permissões) — Notion 4.x
- Sprint 3 · Turmas / Operação
- Sprint 4 · Certificação (templates, PDF, endpoint público QR)
- Hardening (ownership em rotas nested, política de retenção de docs)