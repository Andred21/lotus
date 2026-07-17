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
| 2026-07-16 | Bloco 1 · Refino de código Sprint 2 | Entregue | Kit de form em `shared/ui/FormField/` (`FormField`/`NestedField`/`FormErrorSummary`/`FormErrorBanner`) mata a duplicação nos 6 diálogos — **não reintroduzir `Field`/`UnmappedErrors` local; `NestedField` é pré-req de `course_modules` (blocos 2-4)**. `Delete{Budget,Quote}Action` tiram a guarda de peso legal ("aprovada não exclui") do controller — que **não tinha teste no path de delete**, agora tem. **DeleteQuote sem transação** (escrita única, padrão `UpdateQuoteAction`); só Budget usa transação (cascade N quotes). Convenção `from()` (entrada) vs `fromModel()` (saída, projeção única) documentada em INSTRUÇÕES | `plans/archive/2026-07-16-bloco1-refino-sprint2.md` | `specs/archive/2026-07-16-bloco1-refino-sprint2-design.md` |
| 2026-07-16 | Bloco 2 · CR Cliente (cargo, principal único, complemento) | Entregue | Coluna é **`job_title`, não `role`** (o card do Notion pedia `role`; `role` já é RBAC/spatie aqui) — entrou no `$fillable` **e** no `$auditInclude`. `PrimaryContactService::ensureSingle()` fecha "no máximo 1 principal" nos **2 caminhos de escrita**: Client Actions (replace-total, o da tela) **e** as rotas nested via `Create/UpdateClientContactAction` — **não voltar a escrever contato direto no Eloquent**. **Cliente sem principal é estado VÁLIDO** (não auto-promover). O unmark usa `$model->update()` por instância — pelo query builder não audita (peso legal). `AppRadioButton` em `shared/ui` **sem `forwardRef`** (o `RadioButton` do Prime é class component; segue a forma do `AppDropdown`, não a do `AppInputText`). **Lição de plano:** task que roda `typescript:transform` quebra os literais TS no mesmo commit (`job_title` gera chave obrigatória, sem `?`) — ou ela já ajusta os consumidores, ou o plano não pode pedir "build verde" na task seguinte | `plans/archive/2026-07-16-bloco2-cr-cliente.md` | `specs/archive/2026-07-16-bloco2-cr-cliente-design.md` |
| 2026-07-17 | Bloco 3 · CR Curso: `course_modules` 1:N (backend) | Entregue | Quadro de módulos da proposta vira entidade 1:N de `courses`. **`sort_order` é derivado do índice do array, NUNCA do payload** (reordenar = mandar o array na ordem nova; o `sort_order` que o cliente enviar é ignorado de propósito) — sem gap/duplicata para validar, sem `unique(course_id, sort_order)`. **Nenhum total persistido:** `total_hours` (módulo) e `modules_total_hours` (curso) derivam em `fromModel`. **`courses.workload_hours` é a carga contratada e NÃO se ajusta à soma dos módulos** — divergência é aviso de tela (§5.7), o backend não valida. Sync = replace instância-a-instância (padrão `UpdateClientAction`), o que **troca os ids dos módulos a cada save** e faz o audit mostrar delete+create. Sem rota/permissão nova (nested de `CourseData` sob `catalog.course.update`). `course_id` entra no `$auditInclude` (não no `$fillable` — a relação o define). **Lição de plano:** teste que envia campo sem conferi-lo é cobertura fantasma (`learnings`/`contents` passavam se gravassem `null`); e a prova e2e via curl precisa de `-H 'Origin: ...'`, senão o Sanctum não trata a request como stateful e o login dá 500 | `plans/archive/2026-07-16-bloco3-course-modules-backend.md` | `specs/archive/2026-07-16-bloco3-course-modules-backend-design.md` |
| 2026-07-17 | Bloco 4 · CR Curso: AppTextarea + módulos reordenáveis (frontend) | Entregue | Fecha os 2 gates herdados do Bloco 3: `useCourseForm` **manda `modules` no payload** (sem o campo, o replace-total do backend apagava todos os módulos em silêncio) e a lista usa **`key={i}`, nunca `module.id`** (o replace troca os ids a cada save). Payload leva só os campos editáveis — **`sort_order`/`total_hours` ficam de fora de propósito** (o backend os deriva; o `except()` os descartaria). **Manipulação do array vive no hook** (`add/remove/patch/moveModule`), não solta no JSX — desvio consciente do `ClientDialog`, que tem `patchContact(setForm, i, ...)` solto vazando o `setForm`; o padrão do hook é o preferido daqui pra frente. Totais derivados no render; aviso de divergência é **âmbar e nunca bloqueia o submit** (§5.7), e curso sem módulo nenhum não é divergência. `AppTextarea` em `shared/ui` **sem** a variante de ícone do `AppInputText` e **sem `autoResize`** (dentro de dialog de altura fixa, empurra o form). i18n em namespace **`courseModule.*`** — `course.module` já existia e significa o módulo "Cursos" do menu. **Lição de plano:** curl de smoke-test precisa de `-H 'Accept: application/json'`, senão o middleware de auth tenta redirecionar para uma rota `login` inexistente e dá 500 (irmão da lição do `-H 'Origin: ...'` do Bloco 3) | `plans/archive/2026-07-17-bloco4-course-modules-frontend.md` (+ `plans/archive/2026-07-17-bloco4-roteiro-verificacao.md`) | `specs/archive/2026-07-17-bloco4-course-modules-frontend-design.md` |

## Backlog (títulos dos próximos blocos — sem plano detalhado ainda)

_Planejamento just-in-time: só escrever o plano/spec quando o bloco entrar em execução._

- **`templates` tem o MESMO bug que o Bloco 4 fechou para `modules` — e ninguém o fechou.**
  `CourseData::$templates` é `public array $templates = []` (sem `Optional`, como `modules` era) e
  `UpdateCourseAction:32-35` faz replace-total dos `certificateTemplates`; o `useCourseForm` **nunca**
  manda `templates`. Logo **todo save de curso pela tela apaga os templates de certificado dele**.
  Hoje é inofensivo (nenhuma tela cria template), mas `POST /api/courses/{course}/templates` existe e
  tem teste — no dia em que o 1º template for criado, o próximo save o apaga. Peso legal máximo.
  **Fix recomendado é sistêmico, não pontual:** `array|Optional = new Optional` em `$templates` **e**
  `$modules`, pulando o replace quando `Optional` — mata a classe inteira do bug, em vez de depender de
  todo form lembrar de mandar toda coleção nested (já falhou 2×). Mandar `modules: []` de propósito
  continua apagando, que é o comportamento desejado. (Achado do review final do Bloco 4.)
- Bloco 5.1 · ADR-19 · bcmath/decimal para dinheiro (padrão de fato sem ADR — peso legal) — antes da Sprint 3
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