# Bloco 6-frontend · Sprint 3 — Operação (frontend) — Design

> Data: 2026-07-21. Frontend + toques de backend (main tree, P-03 — não worktree).
> Fontes: specs backend `archive/2026-07-{20,21}-bloco6{a,b,c,d}-*`, `generated.ts`,
> `Operation/routes.php`, rules `.claude/rules/{frontend-fsliced,generated-types,backend-ddd}.md`,
> **prints do protótipo Figma do módulo Operacional** (anexados pelo João, 2026-07-21).
> Decisões do João nesta sessão de brainstorming registradas em §2. Figma/Drive **não** consultados
> via MCP — trabalhado sobre os prints + docs locais.

## Papel na solução

Entrega a **interface do módulo Operação** — a fase operacional que os blocos 6a–6d construíram no
backend (aluno/vínculo, turma/designação, matrícula/import, conclusão/manual). É a primeira feature
frontend com **página de detalhe não-modal com abas** (molde `BudgetDetailPage`), não só diálogos
CRUD. Fecha a pendência P-07 (i18n das 3 permissões operacionais) e, ao final, semeia o banco com um
cenário operacional completo para dar realidade à UI.

## 1. Fronteira & fatiamento

Feature `operation` é **greenfield** (só `.gitkeep`). Molde principal: `commercial`
(`ModulePage`+abas no hub; `BudgetDetailPage` como página de detalhe não-modal).

**1 spec (este doc) → 3 execuções** (cada uma seu plano/`/executar-bloco`, revisável isolada). As
abas do Figma mapeiam limpo nas execuções:

| Exec | Entrega (telas) | Abas Figma | Toque backend |
|------|-----------------|-----------|---------------|
| **1 · Turmas** | hub `/operacion` (fila Pendentes + tabela de turmas); página detalhe `/operacion/turmas/:id` (shell + abas); `Configuración` (view/edit, **reusada p/ create**); `Redactor` (picker idôneo) | Configuración, Redactor | `TurmaQueryBuilder` + `TurmaData` enriquecido + endpoint "pendentes" |
| **2 · Matrícula** | aba `Alumnos`: matrícula individual com **pré-check de troca de cliente (2 passos)**; import xlsx/csv + resumo; remoção | Alumnos | endpoint **preview de RUT** (não-mutante) |
| **3 · Docs + conclusão** | aba `Documentación` (3 tipos, progresso, habilitada derivada); aba `Conclusión` (confirm irreversível RN-15/16); manual PDF; **P-07** i18n | Documentación, Conclusión | nenhum |
| **task final** | **seed operacional** — popula todas as entidades simulando o operacional | — | seeder demo |

**Fora (não implementar):**
- Interface do **redator** (login próprio já existe; a tela dele é sprint futura — 6d/D1). Os docs de
  turma sobem por admin/superadmin nesta fase.
- Escrita de **notas/presença/aprovação** (endpoint é sprint do redator; a aba Alumnos só lista o
  `approval_status`).
- **Feedbacks** (RF-FBK) → sprint futura.
- Templates de documento gerados via código (FUT-1) e ancoragem cross-módulo genérica (FUT-2) —
  registrados como futuros (§8), não construídos.
- Certificação (Sprint 4) — só o gancho "certificados disponíveis" aparece no toast de conclusão.

## 2. Decisões travadas (brainstorming, João, 2026-07-21)

| # | Decisão | Fundamento |
|---|---------|-----------|
| D1 | **Fatiamento: 1 spec, 3 execuções** (turmas / matrícula / docs+conclusão) + task de seed. | Superfície grande; review por partes. |
| D2 | **Criar turma = fila "Pendentes de configuración" no hub** Operação (cotações aprovadas sem turma → "Configurar turma"). Operação é dona do fluxo. | 6b/D1 ("fila de pendências de configuração"); Figma. |
| D3 | **Página reusa o form de `Configuración` para o cadastro.** "Configurar turma" abre o mesmo form em modo create, pré-ligado ao `quote_id` → `POST quotes/{quote}/turma` → cai no detalhe. Sem `CreateTurmaDialog` separado. | João; molde view=edit=create do projeto. |
| D4 | **Picker de redator idôneo = filtro client-side.** `redatoresApi.useList()` + `lib/eligibility` (course_ids inclui `turma.course_id` **E** REUF válido). Sem endpoint novo (o `GET redatores-habilitados` que a 6b deixou em aberto **não** nasce). | Padrão cristalizado "idoneidade se calcula no front"; precedente `coursesApi` read-only. |
| D5 | **Aviso de troca de cliente na matrícula individual = pré-check em 2 passos.** Endpoint de preview resolve o RUT (sem mutar); se pertence a outro cliente, o front confirma antes de matricular. | 6c: individual move em silêncio (RN-10); front "deve avisar". RF-ALU-04. |
| D6 | **Taxonomia de documentos = os 3 do backend** (`MANUAL`, `PRUEBAS`, `EVALUACION_REDATOR`). O Figma mostrava 4 (Lista de asistencia, Acta de cierre) — **rótulos exploratórios**; RN-16 (peso legal) fica intocada. | João, 2026-07-21. Divergência registrada em §8 caso a Lotus peça os 4. |
| D7 | **Sem código próprio de turma (TR-NN).** A identificação vem **por relacionamento, do backend**: `quote_code` (cotação) + `budget_code` (orçamento) + `budget_id` (p/ link). Join via `TurmaQueryBuilder`. | João, 2026-07-21. "Facilitar a identificação a qual proposta e cotação a turma pertence." |
| D8 | **Detalhe = página não-modal com abas** (`BudgetDetailPage` molde), não diálogo. | Figma; João ("seria uma page, assim como Orçamento"). |

### Decisões da Exec 3 (brainstorming, João, 2026-07-23)

| # | Decisão | Fundamento |
|---|---------|-----------|
| D9 | **`AppToast` novo em `shared/ui` + provider global** (`app/providers`), consumido por `shared/hooks/useToast`. O toast de conclusão não vira banner inline nem Toast local da página. | João, 2026-07-23. O projeto não tinha infra de toast; a Sprint 4 (certificação) reusa. |
| D10 | **Manual PDF via `axios responseType: 'blob'` + `objectURL`**, aberto em aba nova e revogado no cleanup — não `window.open` da rota. | João, 2026-07-23. `window.open` joga 403/500 RFC 7807 crus numa aba e não tem estado de loading. |
| D11 | **P-07 já está satisfeita no código**: as 8 chaves `perm.operation_*` (incluindo `operation_enrollment_manage`, `operation_turma_submit_docs`, `operation_turma_complete`) existem nos 3 locales desde `c48496c` (Bloco 5.4). A Exec 3 **prova** na UI e encerra P-07 em `pendencias.md`; não reescreve os textos. | João, 2026-07-23. Divergência entre §6 desta spec e o código, resolvida a favor do código. |

## 3. Telas (Figma) → composição

**Hub `/operacion`** (`OperationPage`, substitui `ModulePlaceholder`):
- `PageHeader` "Operación" / "Gestión de turmas y cotizaciones aprobadas".
- Seção **"Cotizaciones aprobadas pendientes de configuración (N)"**: linhas `cliente · curso · N alumnos`
  + botão "Configurar turma". Some quando vazio.
- Tabela de turmas: busca (curso/cliente/código) + filtro de estado; colunas **CÓDIGO** (orçamento/
  cotação por relacionamento, D7), **CURSO**, **CLIENTE**, **MODALIDAD** (tag), **REDACTOR** (nome ou
  "— Sin asignar"), **ALUMNOS** (count), **ESTADO** (tag). Linha → `/operacion/turmas/:id`.
- Empty-states (sem turmas / sem pendentes) tratados; o toggle "Con datos/Sin datos" do protótipo é
  preview de empty-state, **não** vira feature.

**Página detalhe `/operacion/turmas/:id`** (`TurmaDetailPage`):
- Cabeçalho: `‹ Volver a Operación`, título `<curso>` + subtítulo `<cliente>`, tags de `status` e
  `modalidade`; identificação orçamento+cotação (link p/ `/comercial/presupuestos/:budget_id`).
- `ModuleTabs`: **Configuración | Alumnos | Redactor | Documentación | Conclusión**.
- **Configuración** (Exec 1): "Datos de la turma" + botão Editar (view↔edit inline). Campos:
  modalidad, local/dirección (`required_if presencial`), fecha inicio, fecha término (`>= inicio`),
  **carga horaria (del curso, solo lectura)** = `CourseData.workload_hours` via `coursesApi`.
- **Redactor** (Exec 1): "REDACTOR ASIGNADO" — card(s) do(s) designado(s) com badge "✓ Idóneo" +
  ação remover; "Cambiar"/"Designar" abre o picker filtrado (D4). Rodapé RN-09. Backend é N:N
  (6b/D5); a UI apresenta o caso comum de 1 mas suporta lista (add/remove por chamada).
- **Alumnos** (Exec 2): botões "Importar planilla (xlsx/csv)" + "Agregar alumno"; tabela NOMBRE
  (avatar+nome), RUT, CLIENTE, ESTADO MATRÍCULA (tag Matriculado/Aprobado/Reprobado); footer
  "N alumnos matriculados". "Agregar alumno" → form individual com pré-check (D5). "Importar" →
  diálogo de upload → `ImportResultSummary` (created/relinked/moved/errors + `enrolled_total` vs
  `contracted_count`).
- **Documentación** (Exec 3): "X de N documentos completos" + barra; lista dos **3 tipos**
  (Entregado/Pendiente) com upload/remoção por tipo (N arquivos por tipo, 6d/D8); banner "completa →
  Habilitada" (derivado). Bloqueado quando `status=concluida` (RN-15).
- **Conclusión** (Exec 3): indicador derivado `En curso (bloqueado)` / `Habilitada (activo)`; banner
  de faltantes (`missing_document_types`) ou "lista para concluir"; aviso RN-15 (imutável +
  certificados disponíveis); botão "Confirmar conclusión" desabilitado até `habilitada`, com **confirm
  irreversível**; sucesso → toast "Conclusión confirmada. Certificados disponibles para emisión."

## 4. Arquitetura frontend — `features/operation/`

```
features/operation/
  api/
    useTurmas.ts            list(enriquecida) · one · update · destroy · createFromQuote · designate/removeRedator · conclude · manual(blob) · pendientes
    useEnrollments.ts       list · enroll(individual) · remove
    useEnrollPreview.ts     preview de RUT (2 passos)
    useImportStudents.ts    upload → ImportResultData
    useTurmaDocuments.ts    list · upload(por tipo) · remove
  components/
    OperationPage.tsx
    Turma/    TurmasTable · PendingQuotesPanel · TurmaDetailPage · TurmaConfigCard(view/edit/create) · RedatorDesignation
    Enrollment/ EnrollmentTable · EnrollStudentForm · MoveConfirmDialog · ImportDialog · ImportResultSummary
    Document/ TurmaDocuments · ConcludePanel · ManualButton
  hooks/     useTurmasPage · useTurmaDetail · useTurmaConfigForm · useRedatorPicker · useEnrollmentSection · useTurmaDocsSection
  lib/       turmaStatus.ts (rótulos/severidades) · eligibility.ts (idoneidade client-side)
```

Padrões (rules `frontend-fsliced`):
- **Rotas fogem do CRUD limpo** (nested + verbos custom) → hooks próprios sobre `api`, invalidando a
  key do pai (molde `useQuotes`/`useCommercialFiles`); **não** `createCrudResource` puro.
- **Componente declarativo**; estado/mutations/derivação no hook. Server state → TanStack Query;
  UI local (passo do form/import) → `useState`.
- **Picker:** `redatoresApi.useList()` + `lib/eligibility.isEligible(redator, turma.course_id)`
  (course_ids inclui o curso **E** REUF `valid_until` null/futuro; inparseável = vencido — direção
  conservadora, peso legal). Zero backend novo (D4). Cross-feature resolvido pela camada `shared/api`
  (redatores vivem em `identity`, mas `redatoresApi`/`coursesApi` já são read-only compartilhados).
- **`TurmaConfigCard`** unifica view/edit/create (campos vazios = create pré-ligado ao `quote_id`, D3).
- **Kit de form** (`shared/ui/FormField/`), `AppDatePicker` (contrato ISO string), `AppFileUpload`,
  `FormErrorSummary` — sem reintroduzir helpers locais.
- **Tabela** via `AppDataTable`; tags via `AppTag`; modalidade/estado com severidade em `lib/turmaStatus`.

## 5. Toques de backend (main tree, P-03)

Consequência das decisões; feature test contra **MySQL** (lição #15) para o que toca query/rota.

### Exec 1
- **`Domains/Operation/QueryBuilders/TurmaQueryBuilder`** — 1º QueryBuilder do projeto (os
  `QueryBuilders/` de todo domínio existem vazios). Custom Eloquent Builder Laravel-nativo (via
  `Turma::newEloquentBuilder()`), **não** Repository (ADR-02). Expõe a projeção de listagem/detalhe:
  join/eager de course (name, workload), quote (code) → budget (code, id) → client (name), e
  `enrolled_count` (matrículas ativas), sem N+1. Forma fina fecha no writing-plans.
- **`TurmaData.fromModel` enriquecido** com `course_name`, `client_name`, `enrolled_count`,
  `quote_code`, `budget_code`, `budget_id`. Regen `typescript:transform`; **ajustar consumidores/tests
  6b/6d no mesmo commit** (lição #11 — assertions de TurmaData que sejam exact-match).
- **Endpoint "pendentes de configuração":** `GET turmas/pendientes-configuracion`
  (`operation.turma.create`) → `array<PendingQuoteData>` (`#[TypeScript]`: `quote_id`, `quote_code`,
  `budget_code`, `client_name`, `course_name`, `student_count`). QueryBuilder: quotes `approved`
  `whereDoesntHave('turma')`.

### Exec 2
- **Endpoint de preview de matrícula (não-mutante):** `GET turmas/{turma}/alunos/preview?rut=…`
  (`operation.enrollment.manage`) → `EnrollPreviewData` (`#[TypeScript]`: `exists`, `name` `?`, `rut`,
  `current_client` `?`, `will_move`, `previous_client` `?`). Variante **read-only** do `StudentResolver`
  (resolve por RUT sem criar/mover). O `POST` de matrícula segue como está.

### Exec 3
- Nenhum toque de backend. Consome `documents`/`conclude`/`manual` existentes + i18n (§6).

## 6. i18n & permissões (P-07)

- Fecha **P-07**: chaves `perm.*` de `operation_enrollment_manage`, `operation_turma_submit_docs`,
  `operation_turma_complete` nos 3 locales (pt-BR/es-CL/en). **Atualização 2026-07-23 (D11):** as
  chaves já foram criadas por `c48496c` (Bloco 5.4, padrão chave com underscore; `es-CL` referência).
  A Exec 3 apenas prova na UI que o picker de Roles não renderiza chave crua e encerra a pendência.
- Namespace novo do módulo (`operation.*`) nos 3 locales, chaves **idênticas**; consome as chaves
  `operation.enrollment.manage` que a 6c deixou anotadas.

## 7. Seed operacional (task final, após Exec 3)

Seeder demo (`OperationDemoSeeder`, chamado pelo `DatabaseSeeder` só em ambiente local/demo) que
popula um cenário ponta a ponta para a UI ter realidade:
- clientes com contatos/endereços; redatores com **REUF válido** + habilitação a cursos; cursos com
  módulos; orçamentos com cotações **aprovadas**; turmas em **status variados** (em_andamento,
  habilitada-derivada, concluida) com redator designado; matrículas com `approval_status` variados;
  documentos de turma cobrindo os 3 tipos em graus diferentes (habilitada vs faltando).
- **DoD:** rodar o seed e **ver os dados na UI** (hub com pendentes + turmas, detalhe com alunos/docs/
  conclusão coerentes) — não "seeder roda sem erro".

## 8. Divergências & futuros — registrar em `pendencias.md`

Registrar como **lembretes** (virar task no Notion + avaliar alteração de doc Drive/local **depois** —
não agora):
- **FUT-1** — Templates de documento **gerados via código**: o redator baixa o template já preenchido
  com dados da turma/alunos, preenche (online ou manuscrito) e sobe. Templates desenhados com a Lotus e
  implementados; disponíveis p/ visualização/download assim que a turma é configurada. Gatilho: definição
  dos templates com o cliente.
- **FUT-2** — Refino de **ancoragem cross-módulo**: dado "compartilhado" vira link que leva o usuário à
  página do módulo dono com a entidade selecionada (ou a exibe inline). Este bloco já entrega o caso
  pontual turma→orçamento; o mecanismo genérico é o futuro.
- **Nota docs 4×3** — o protótipo Figma mostrava 4 tipos de documento de turma (Lista de asistencia,
  Acta de cierre) mas a decisão (D6) manteve os 3 do backend (RN-16). Gatilho: se a Lotus pedir os 4.

## 9. Definition of Done (por execução)

- **Frontend (todas):** `pnpm build` (tsc -b) + `pnpm lint` verdes; **comportamento provado** na UI
  contra o backend real (não build verde isolado) — gate do projeto (lei §8).
- **Exec 1:** hub lista turmas enriquecidas (curso/cliente/orçamento+cotação/redator/alunos/estado) e
  pendentes; "Configurar turma" cria e cai no detalhe; Configuración edita; Redactor designa só idôneos
  (inelegível não aparece; 422 do gate tratado). Backend: feature test MySQL do QueryBuilder + endpoint
  pendentes + `TurmaData` enriquecido.
- **Exec 2:** matrícula individual com pré-check (RUT de outro cliente → confirm antes); import mostra
  resumo fiel (created/relinked/moved/errors, enrolled vs contracted); remoção. Backend: feature test
  MySQL do preview (não-mutante, ramos exists/will_move).
- **Exec 3:** upload dos 3 tipos + progresso + habilitada derivada; conclusão bloqueada até habilitada,
  confirm irreversível, toast; manual abre PDF; **P-07 fechada** (picker de Roles sem chave crua).
- **Seed:** dados visíveis e coerentes na UI.
