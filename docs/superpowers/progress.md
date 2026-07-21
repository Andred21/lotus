# Progresso — Lotus v2

Índice vivo do projeto. **Uma linha por feature.** Sessão nova lê este arquivo primeiro
para reconstruir contexto antes de qualquer plano/spec.

- **Ativo** = feature em desenvolvimento; plano/spec em `plans/` e `specs/`.
- **Entregue** = mergeado e provado; plano/spec movidos para `plans/archive/` e `specs/archive/`.
- **Contexto** = o que uma sessão nova precisa carregar para trabalhar neste bloco — e nada além.
  Preenchida só para **Ativo** e **backlog**; entregue fica `—` (o plano arquivado tem o detalhe).
  Padrão de código NÃO entra aqui: as rules de `.claude/rules/` carregam sozinhas.
- Detalhe de decisões: `docs/adrs.md`. Schema: `docs/der-fisico.md`. Divergências conhecidas:
  `docs/pendencias.md`.

> **Política de corte (este arquivo é carregado em TODA sessão):** passou de **25 linhas** na tabela,
> particione — o arquivo raiz mantém `Ativo` + backlog + as **10 últimas** entregues; o resto vai
> para `progress-archive.md`, consultado só sob demanda. Hoje: 23 linhas.

| Data | Feature | Status | Resultado (1 linha) | Contexto | Plano | Spec |
|------|---------|--------|---------------------|----------|-------|------|
| 2026-07-04 | Login + store de sessão | Entregue | Auth SPA Sanctum, guard de rota, sessão em Zustand hidratada no boot | — | `plans/archive/2026-07-04-login-flow-session.md` | `specs/archive/2026-07-04-login-flow-session-design.md` |
| 2026-07-06 | App Shell + Sidebar RBAC | Entregue | Shell (sidebar+header), nav filtrada por RBAC, dark mode layout-only em uiStore | — | `plans/archive/2026-07-06-app-shell-sidebar.md` | — |
| 2026-07-07 | Sprint 1 · Cadastros backend (Cliente + Redator) | Entregue | Schema, models, DTOs, validação RUT, actions, controllers; provado em sqlite `:memory:` | — | `plans/archive/2026-07-07-sprint1-cadastros-backend.md` | `specs/archive/2026-07-07-sprint1-cadastros-backend-design.md` |
| 2026-07-08 | Sprint 1 · Cursos backend | Entregue | `courses` + `course_certificate_templates` + `course_redator` (N:N habilitação) | — | `plans/archive/2026-07-08-sprint1-cadastros-cursos-backend.md` | — |
| 2026-07-09 | Frontend · Fundação da UI | Entregue | Molde reutilizável: ModulePage, CrudDialog, useCrudPage, useEntityForm, i18n, tema dark | — | `plans/archive/2026-07-09-frontend-fundacao-ui.md` | — |
| 2026-07-09 | Sprint 1 · Cadastros frontend + docs tipados | Entregue | Telas Cliente/Redator sobre hooks CRUD; documentos tipados do redator no backend | — | `plans/archive/2026-07-09-sprint1-cadastros-frontend.md` | `specs/archive/2026-07-09-sprint1-cadastros-frontend-design.md` |
| 2026-07-09 | Sprint 1 · Correções code-review | Entregue | 7 defeitos do review corrigidos; build verde, comportamento provado por teste | — | `plans/archive/2026-07-09-sprint1-correcoes-code-review.md` | — |
| 2026-07-10 | Sprint 1 · Catálogo frontend | Entregue | `/cursos`: listagem + form com habilitação de redatores (fecha Sprint 1) | — | `plans/archive/2026-07-10-sprint1-catalog-frontend.md` | `specs/archive/2026-07-10-sprint1-catalog-frontend-design.md` |
| 2026-07-10 | Sprint 2 · Comercial backend | Entregue | Budget agrupa Quotes independentes; status/totais derivados (bcmath); aprovação superadmin; anexos polimórficos. ADR-17 (seq atômica) nasceu aqui | — | `plans/archive/2026-07-10-sprint2-commercial-backend.md` | `specs/archive/2026-07-10-sprint2-commercial-backend-design.md` |
| 2026-07-13 | Sprint 2 · Comercial frontend | Entregue | Lista de orçamentos, detalhe com cotações, wizard de cotação (passo em useState), aprovação/recusa, anexos | — | `plans/archive/2026-07-13-sprint2-commercial-frontend.md` | `specs/archive/2026-07-13-sprint2-commercial-frontend-design.md` |
| 2026-07-14 | Bloco 0 · Sync de docs pós-Sprint 2 | Entregue | Docs voltam a bater com o código: `budgets` sem status/total (derivados no `BudgetSummaryService`), `quotes` sem `client_id`; ADR-17 fechado | — | — (docs-only) | — |
| 2026-07-16 | Bloco 1 · Refino de código Sprint 2 | Entregue | Kit de form em `shared/ui/FormField/` mata a duplicação dos 6 diálogos; `Delete{Budget,Quote}Action` tiram a guarda de peso legal do controller e ganham teste | — | `plans/archive/2026-07-16-bloco1-refino-sprint2.md` | `specs/archive/2026-07-16-bloco1-refino-sprint2-design.md` |
| 2026-07-16 | Bloco 2 · CR Cliente (cargo, principal único, complemento) | Entregue | `client_contacts.job_title`; `PrimaryContactService::ensureSingle()` fecha "no máximo 1 principal" nos 2 caminhos de escrita; `AppRadioButton` em `shared/ui` | — | `plans/archive/2026-07-16-bloco2-cr-cliente.md` | `specs/archive/2026-07-16-bloco2-cr-cliente-design.md` |
| 2026-07-17 | Bloco 3 · CR Curso: `course_modules` 1:N (backend) | Entregue | Quadro de módulos da proposta vira entidade 1:N de `courses`; `sort_order` derivado do índice do array e totais derivados em runtime — nada persistido | — | `plans/archive/2026-07-16-bloco3-course-modules-backend.md` | `specs/archive/2026-07-16-bloco3-course-modules-backend-design.md` |
| 2026-07-17 | Bloco 4 · CR Curso: AppTextarea + módulos reordenáveis (frontend) | Entregue | Tela de módulos com reordenação, totais derivados no render e aviso âmbar de divergência de carga (nunca bloqueia); `AppTextarea` em `shared/ui` | — | `plans/archive/2026-07-17-bloco4-course-modules-frontend.md` (+ roteiro) | `specs/archive/2026-07-17-bloco4-course-modules-frontend-design.md` |
| 2026-07-17 | Bloco 5.0 · Coleção nested ausente não apaga (fix de peso legal) | Entregue | `CourseData::$templates`/`$modules` viram `Optional`: ausente = não mexe, `[]` = apaga — save de curso pela tela não apaga mais os templates de certificado | — | — (fix) | — |
| 2026-07-17 | Bloco 5.1 · ADR-19 + sync de docs | Entregue | ADR-19 (dinheiro = decimal + bcmath) escrito e ADR-15 reescrito contra a realidade (i18next, dicionários separados por camada); `app/Data` corrigido nas leis | — (docs-only) | — |
| 2026-07-17 | Bloco 5.2a · Administração: aba Usuarios | Entregue | CRUD de staff-user (`type=admin` + role Spatie) em `/administracion`; `SuperadminGuard` bloqueia (422) tirar o último superadmin ativo; `AuthController::login()` virou guard-explícito (`Auth::guard('web')`) — request `auth:sanctum` no mesmo processo trocava o guard default e dava 500 no login encadeado | — | `plans/archive/2026-07-17-bloco5.2a-usuarios.md` | `specs/archive/2026-07-17-bloco5.2a-usuarios-design.md` |
| 2026-07-18 | Bloco 5.2b · Administração: aba Roles y Permisos | Entregue | Ver roles de sistema read-only + criar/editar role customizada de subconjunto do catálogo fixo (`PermissionCatalog` = fonte única, também do seeder); guardrail das 3 segregadas em 2 camadas (422 no back + some do picker). **Validação de DTO roda ANTES do Action**: `notIn(SYSTEM_ROLES)` NÃO pode ficar em `RoleData::rules()` senão PUT de role de sistema dá 422 em vez do 403 do `SystemRoleGuard` — bloqueio de nome de sistema no create vem da colisão de nome | — | `plans/archive/2026-07-18-bloco5.2b-roles-permisos.md` | `specs/archive/2026-07-18-bloco5.2b-roles-permisos-design.md` |
| 2026-07-19 | Bloco 5.3 · Refino frontend Comercial (H.1.3) | Entregue | Refino C+B das revisões: array-helpers no `useClientForm`, `AddressFields`/`ContactFields`, `useBudgetDetail` (BudgetDetailPage declarativo), `AppDatePicker` (contrato ISO string anti-fuso + locale es-CL), `FormErrorBanner`/`AppRadioButton`, stepper, a11y, toolbar/ordem. **Lição:** `aria-label` em botão de upload do Prime (`FileUpload` basic) vai por `pt.basicButton` — `chooseOptions` descarta chaves desconhecidas | — | `plans/archive/2026-07-19-refino-comercial-frontend.md` | `specs/archive/2026-07-19-refino-comercial-frontend-design.md` |
| 2026-07-20 | Bloco 5.4 · Refino frontend Administração | Entregue | `FormErrorSummary` nos 2 diálogos (422 de permissão deixa de sumir), toolbar contextual por aba, grupos+descrições de permissão via `permGroup.*`/`perm.*` (chave com underscore — keySeparator `.` do i18next proíbe ponto), Tipo como tag. `PermissionCatalog.description` virou dev-facing — permissão nova exige as 3 chaves `perm.*` nos locales | — | `plans/archive/2026-07-20-refino-administracao-frontend.md` | `specs/archive/2026-07-20-refino-administracao-frontend-design.md` |
| 2026-07-20 | Bloco 6a · Sprint 3 · Aluno + vínculo + resolução (backend) | Entregue | `Student` extensão de `User` (type=aluno, não loga); `student_client_logs` histórico RN-10 com 1-vínculo-aberto garantido por coluna gerada única; `StudentResolver` por RUT (novo→cria, existe→associa/move) — fundação do import da Turma (6c). **Lição #15:** coluna gerada STORED dependendo de FK proíbe `ON DELETE CASCADE` no InnoDB — `student_id` é `restrict`; passava em sqlite e só a prova real de MySQL no gate pegou. Sem REST/tela/`StudentData` (YAGNI). Provado e2e contra MySQL: 7 ramos + constraint | — | `plans/archive/2026-07-20-bloco6a-aluno-vinculo.md` | `specs/archive/2026-07-20-bloco6a-aluno-vinculo-design.md` |
| 2026-07-21 | Bloco 6c · Sprint 3 · Matrícula + importação de alunos (backend) | **Ativo** | `enrollments` + individual/import xlsx-csv/remoção sobre StudentResolver (6a) e Turma (6b); openspout; transação por linha | Spec+plano do 6c; `StudentResolver` (6a) e `Turma`/testes Operation (6b) como molde; decisões D1–D9 na spec (email obrigatório só p/ aluno novo; permissão `operation.enrollment.manage` JÁ existe no catálogo) | `plans/2026-07-21-bloco6c-matricula-import.md` | `specs/2026-07-21-bloco6c-matricula-import-design.md` |
| 2026-07-21 | Bloco 6b · Sprint 3 · Turma + designação de redator (backend) | Entregue | `Turma` (1:1 cotação aprovada, nasce manual em_andamento), N:N `turma_redator`, gate RN-09 `RedatorIdoneidadeService` (REUF válido + habilitação), CRUD REST + designação. **1:1-turma-VIVA por coluna gerada `active_quote_id`** (não `unique(quote_id)` simples — soft-delete+recriar dava 500; padrão do 6a `open_link`, quote_id RESTRICT evita 1215). **Lição #15 de novo**: MySQL pegou 2 bugs que sqlite mascarava (`->unique()` após `->constrained()` não emite índice; `false`→`''` em `valid_until`). Designação POST retorna 200 (não 201 spatie) — candidato a ADR. e2e real provado (201/200/422 RN-09) | — | `plans/archive/2026-07-21-bloco6b-turma-designacao.md` | `specs/archive/2026-07-21-bloco6b-turma-designacao-design.md` |

## Backlog (títulos dos próximos blocos — sem plano detalhado ainda)

_Planejamento just-in-time: só escrever o plano/spec quando o bloco entrar em execução._
_Formato: `- Título — Contexto: <o que carregar>`. Contexto é palpite até o bloco ser planejado._

- Bloco 6d · Sprint 3 · Conclusão + manual (backend) — Contexto: máquina de estados turma
  (`em andamento→habilitada→concluída`), RN-15 (blindagem)/RN-16 (doc habilita, admin confirma),
  manual Blade sob demanda. Depende do upload de doc do redator (interface redator — sprint futura)
- Bloco 6-frontend · Sprint 3 · Operação frontend — Contexto: depois dos blocos backend, como nas
  Sprints 1 e 2; `tela-turmas.md` (hub Operação, tela própria não-modal)
- Bloco 7 · Sprint 4 · Certificação (templates, PDF, endpoint público QR) — Contexto: `adrs.md`
  (ADR-08/10), `der-fisico` (certificates, certificate_sequences), lição sobre snapshot de template
  no ato da emissão
- Hardening (ownership em rotas nested, política de retenção de docs)
- Check de paridade permissão↔i18n — teste/CI que assere `array_keys(PermissionCatalog::descriptions())`
  (dot→underscore) == chaves `perm.*` de cada locale; sem isso, permissão nova renderiza chave crua no
  picker (achado do review final do Bloco 5.4). Contexto: `PermissionCatalog` + locales.
- Unicidade de `client_addresses.is_primary` — mesmo gap que o Bloco 2 fechou nos contatos; ficou de
  fora porque o contratante não pediu e a tela só edita o 1º endereço. `PrimaryContactService` é o molde.
- `ClientContactData.is_primary` tem default `false` **não-`Optional`** — `PUT /api/contacts/{id}` sem o
  campo rebaixa o principal em silêncio. Pré-existente; rota sem consumidor no front (achado do review
  final do Bloco 2).
- Decidir: a UI não consegue voltar a **zero** principais (radio não desmarca), mas o backend aceita 0 —
  assimetria entre as camadas, nunca decidida explicitamente (achado do review final do Bloco 2).
- Consolidar as migrations "adicionais" nas originais — antes de subir para produção (decisão do João
  no Bloco 2, para o folder de migrations não inchar).
- Bloco 5.2a (Minors do review final, nenhum afeta correção) — `SuperadminGuard` sem teste do caso
  superadmin **inativo** (guard é no-op ali); `UserData::fromModel` chama `getRoleNames()` 2×;
  unicidade rut/email do `UpdateStaffUserAction` roda **fora** da transação (o `Create` roda dentro);
  auto-colisão de rut/email no update (mesmo valor, mesmo id) sem teste; teste do 422 de `redator`
  não afirma a chave `role`. Molde: `SuperadminGuard`/`UserData`/`UpdateStaffUserAction`.
- Bloco 5.2b (Minors do review final, nenhum afeta correção) — testes de falha das Actions
  (`CreateRoleAction`/`UpdateRoleAction`) afirmam só `expectException(ValidationException::class)`,
  não a chave do error-bag (`name` vs `permissions`); **decisão pendente do João:** `GET /api/roles`
  (gate `identity.user.view`) devolve `permissions[]` de toda role, então admin comum enumera as
  permissões do superadmin — enquanto `/api/permissions` é superadmin-only. Tornar consistente =
  projeção mais leve no `index` sem `identity.access.manage`. Molde: `RoleController@index`/`RoleData`.