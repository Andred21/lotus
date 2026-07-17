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
| 2026-07-14 | Bloco 0 · Sync de docs pós-Sprint 2 | Entregue | Docs voltam a bater com o código: `budgets` sem status/total (derivados no `BudgetSummaryService`), `quotes` sem `client_id`; ADR-17 fechado | — (docs-only) | — |
| 2026-07-16 | Bloco 1 · Refino de código Sprint 2 | Entregue | Kit de form em `shared/ui/FormField/` mata a duplicação dos 6 diálogos; `Delete{Budget,Quote}Action` tiram a guarda de peso legal do controller e ganham teste | `plans/archive/2026-07-16-bloco1-refino-sprint2.md` | `specs/archive/2026-07-16-bloco1-refino-sprint2-design.md` |
| 2026-07-16 | Bloco 2 · CR Cliente (cargo, principal único, complemento) | Entregue | `client_contacts.job_title`; `PrimaryContactService::ensureSingle()` fecha "no máximo 1 principal" nos 2 caminhos de escrita; `AppRadioButton` em `shared/ui` | `plans/archive/2026-07-16-bloco2-cr-cliente.md` | `specs/archive/2026-07-16-bloco2-cr-cliente-design.md` |
| 2026-07-17 | Bloco 3 · CR Curso: `course_modules` 1:N (backend) | Entregue | Quadro de módulos da proposta vira entidade 1:N de `courses`; `sort_order` derivado do índice do array e totais derivados em runtime — nada persistido | `plans/archive/2026-07-16-bloco3-course-modules-backend.md` | `specs/archive/2026-07-16-bloco3-course-modules-backend-design.md` |
| 2026-07-17 | Bloco 4 · CR Curso: AppTextarea + módulos reordenáveis (frontend) | Entregue | Tela de módulos com reordenação, totais derivados no render e aviso âmbar de divergência de carga (nunca bloqueia); `AppTextarea` em `shared/ui` | `plans/archive/2026-07-17-bloco4-course-modules-frontend.md` (+ roteiro) | `specs/archive/2026-07-17-bloco4-course-modules-frontend-design.md` |
| 2026-07-17 | Bloco 5.0 · Coleção nested ausente não apaga (fix de peso legal) | Entregue | `CourseData::$templates`/`$modules` viram `Optional`: ausente = não mexe, `[]` = apaga — save de curso pela tela não apaga mais os templates de certificado | — (fix) | — |
| 2026-07-17 | Bloco 5.1 · ADR-19 + sync de docs | Entregue | ADR-19 (dinheiro = decimal + bcmath) escrito e ADR-15 reescrito contra a realidade (i18next, dicionários separados por camada); `app/Data` corrigido nas leis | — (docs-only) | — |

## Backlog (títulos dos próximos blocos — sem plano detalhado ainda)

_Planejamento just-in-time: só escrever o plano/spec quando o bloco entrar em execução._

- Bloco 5.2 · Módulo Administração (Usuários, Roles/Permissões) — Notion 4.x
- Bloco 6 · Sprint 3 · Turmas / Operação
- Bloco 7 · Sprint 4 · Certificação (templates, PDF, endpoint público QR)
- Hardening (ownership em rotas nested, política de retenção de docs)
- Unicidade de `client_addresses.is_primary` — mesmo gap que o Bloco 2 fechou nos contatos; ficou de
  fora porque o contratante não pediu e a tela só edita o 1º endereço. `PrimaryContactService` é o molde.
- `ClientContactData.is_primary` tem default `false` **não-`Optional`** — `PUT /api/contacts/{id}` sem o
  campo rebaixa o principal em silêncio. Pré-existente; rota sem consumidor no front (achado do review
  final do Bloco 2).
- Decidir: a UI não consegue voltar a **zero** principais (radio não desmarca), mas o backend aceita 0 —
  assimetria entre as camadas, nunca decidida explicitamente (achado do review final do Bloco 2).
- Consolidar as migrations "adicionais" nas originais — antes de subir para produção (decisão do João
  no Bloco 2, para o folder de migrations não inchar).