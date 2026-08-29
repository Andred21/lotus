# DER Físico (MySQL) — Lotus

> Snapshot de 2026-07-04 (atualizado 2026-07-30, pós-Sprint 3 / doc-sync da Sprint 4). Fonte canônica: `Drive/V2/Planejamento/3-avancado/modelo-fisico-e-diagramas.md`.
> DER FÍSICO: com tipos MySQL, PK/FK, índices. Difere do modelo conceitual (camada intermediária, sem tipos).
> **Consulte antes de criar migration, model ou mexer em schema.** Os nomes aqui são a referência — não invente nomes divergentes.
>
> Correções da dívida da v1 aplicadas: AUTO_INCREMENT, tamanho de password/token, timestamps padrão, soft delete, ENUMs sem typo, política de FK.

> **⚠️ Divergência de idioma (em aberto).** O schema **implementado** está em **inglês** (decisão do João Victor — spec `2026-07-07-sprint1-cadastros-backend-design.md` §2.1); o canônico do Drive segue em **PT/ES**. Neste doc:
> - **Tabelas implementadas** = documentadas em inglês, batendo 1:1 com as migrations reais (fato verificável).
> - **Exceção de nome próprio:** `redator`/`redatores`/`redator_id` ficam em PT (nome de domínio, casam com o morph map).
> - Alinhar o **Drive canônico** ao inglês é follow-up pendente de autorização (write externo). Se o Drive divergir, o Drive vence — sinalize.
>
> **Pendente de sync com o Drive (Sprint 2):** `budgets`/`quotes` foram implementadas em inglês e com 3 desvios deliberados do rascunho canônico — `budgets` **sem** `valor_total_uf` e **sem** `status` (derivados no `BudgetSummaryService`), e `quotes` **sem** `client_id` (chega pelo budget). Refletir no Drive quando o write externo for autorizado.
>
> **Divergências code↔canônico confirmadas no cross-ref de 2026-07-10** (o Drive foi atualizado no mesmo dia e ainda carrega o estado antigo): o `lotus_modelo_fisico.sql` canônico mantém `clients.rut_empresa NOT NULL UNIQUE` e `clients.tipo ENUM('cliente','proveedor')` (2 valores, PT). O código **intencionalmente** dropou `rut_empresa` (RUT vive em `users.rut`, spec §2.3) e usa `type ENUM('client','provider','other')`. Ao sincronizar o Drive, refletir essas duas mudanças.

---

## Tabelas IMPLEMENTADAS (inglês — refletem as migrations)

### Identity
- **users** — `id PK`, `uuid UK`, `name`, `rut UK` (nullable, 20), `email UK`, `phone` (nullable, 30), `photo_path` (nullable), `password`, `type` enum(`admin`,`redator`,`aluno`,`cliente`), `is_active` (bool, default false), `remember_token`, `deleted_at`. Índices: `type`, (`type`,`is_active`). **Sem índice em `name`:** candidato recusado pelo `EXPLAIN` no bloco de performance (a lista de alunos começa o join por `students` e o otimizador não troca a ordem) — ver `docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md`. Só admin/redator autenticam (RN-01).
- **login_logs** — `id PK`, `user_id FK` → users cascade, `ip_address` (nullable, 45), `user_agent` (nullable, text), `created_at`. Índice composto (`user_id`,`created_at`) e `login_logs_created_at_index` em `created_at` (poda — P-66, fechada em 2026-08-28: o composto não serve consulta sem a coluna líder). Log **append-only** de logins bem-sucedidos (sem `updated_at`, sem soft-delete, não Auditable). O "último acesso" das telas de Usuários e Redatores é derivado daqui por `User::latestLogin()` — **não existe coluna `users.last_login`**. Bloco `last-login` (BD-7). **Retenção:** descarte direto aos 12 meses (`RetentionPolicy::LOGIN_LOGS_DESCARTAR_MESES`, `backend/app/Shared/Retention/RetentionPolicy.php`) — sem fase de anonimização, porque a tabela não guarda trilha de mudança a preservar (P-33, fechada por este mecanismo). Executado por `lotus:podar-logins` (`PodarLogins`), agendado às 03:40 America/Santiago (`routes/console.php`). Consequência aceita: conta sem login há mais de 12 meses perde o "último acesso" que este parágrafo descreve.
- **clients** — `id PK`, `user_id FK,UK` → users cascade, `legal_name` (razón social), `type` enum(`client`,`provider`,`other`) default `client`, `business_activity` (nullable, giro), `deleted_at`. Extensão 1:1 de users. **RUT do cliente vive em `users.rut`** (sem coluna própria).
- **client_addresses** — `id PK`, `client_id FK` → clients cascade, `line1`, `line2`, `number`, `commune`, `city`, `region`, `zip_code` (todos nullable), `is_primary` (bool, default false), `deleted_at`. Índice: `is_primary`. 1:N.
- **client_contacts** — `id PK`, `client_id FK` → clients cascade, `name`, `email` (nullable), `phone` (nullable, 30), `job_title` (nullable, cargo/área do contato — `job_title` e não `role` porque `role` é RBAC), `is_primary` (bool, default false), `deleted_at`. Índice: `is_primary`. 1:N.
- **redatores** — `id PK`, `user_id FK,UK` → users cascade, `deleted_at`. Extensão 1:1 de users. (Nome em PT — ver banner.)
- **students** (alunos) — `id PK`, `user_id FK,UK` → users cascade, `current_client_id FK` (nullable) → clients `nullOnDelete`, `deleted_at`. Extensão 1:1 de users (`type=aluno`, `is_active=false`, **sem role** — não autentica, RN-01). `current_client_id` = ponteiro do vínculo aberto, mantido pelo `StudentClientLinkService` (fonte única). Soft-delete cascateia p/ o user (hook `deleting`). Auditable. Bloco 6a.
- **student_client_logs** — `id PK`, `student_id FK` → students **`restrictOnDelete`**, `client_id FK` → clients `restrictOnDelete`, `started_on` (date), `ended_on` (date, nullable — `NULL` = vínculo aberto), `open_link_student_id` (**gerada STORED** = `CASE WHEN ended_on IS NULL THEN student_id END`, **`UNIQUE`**), timestamps. Histórico append-only do vínculo aluno↔cliente (RN-10): **sem soft-delete**, sem auditoria (é o próprio registro histórico). A coluna gerada + índice único garantem **1 vínculo aberto por aluno** no banco. **`student_id` é `restrict` (não cascade):** o InnoDB proíbe `ON DELETE CASCADE` numa FK cuja coluna uma coluna gerada STORED referencia (erro 1215; sqlite ignora — lição #15). Bloco 6a.

### Catalog
- **courses** — `id PK`, `name`, `technical_name` (nullable), `description` (text, nullable), `workload_hours` (smallint, carga horária), `deleted_at`.
- **course_certificate_templates** — `id PK`, `course_id FK` → courses cascade, `version` (int, **derivado** por `MAX+1` sob `lockForUpdate` na Action — nunca input do cliente, mesmo padrão do `seq_in_budget`/ADR-17), `layout_config` (json), `validity_months` (smallint, nullable, vigência), `deleted_at`. **`UNIQUE(course_id, version)`** — índice cru, sem `deleted_at` na chave: número arquivado não se reaproveita, então a derivação conta os arquivados.
- **course_redator** — `id PK`, `course_id FK`, `redator_id FK` → redatores cascade, `unique(course_id, redator_id)`. Pivô N:N puro (idoneidade: quais redatores podem ministrar cada curso), **sem soft-delete**.
- **course_modules** — `id PK`, `course_id FK` → courses cascade, `sort_order` (smallint, o "Item" 1..N — derivado do índice do array na Action, nunca do payload), `name`, `learnings` (text, nullable), `contents` (text, nullable, tópicos 1.1/1.2 em texto livre), `theory_hours` / `practice_hours` (smallint, default 0), `deleted_at`. Índice: `(course_id, sort_order)`. **Sem coluna de total** — horas do módulo e soma do curso são derivadas em runtime (`CourseModuleData`/`CourseData`); `courses.workload_hours` é a carga contratada, independente da soma (divergência é aviso de tela, não gate).

### Commercial
- **budgets** (orçamentos) — `id PK`, `client_id FK` → clients cascade, `code` (varchar UK, nullable no schema, imutável — `'Scap '.id` gerado na Action na mesma transação, ADR-17), `payment_terms` (nullable, forma de pagamento em texto livre), `deleted_at`. Agrupa N cotações. **Sem coluna de status nem de total:** ambos são **derivados** das cotações (`BudgetSummaryService`, bcmath) — não persistir.
- **quotes** (cotações) — `id PK`, `budget_id FK` → budgets cascade, `course_id FK` → courses (restrict), `seq_in_budget` (smallint, contador atômico por orçamento — `UNIQUE(budget_id, seq_in_budget)`, ADR-17), `student_count` (int), `planned_start_date` / `planned_end_date` (date, nullable), `purchase_order` (nullable, OC do cliente), `value_uf` (decimal 12,4), `status` enum(`pending`,`approved`,`rejected`) default `pending`, `approved_at` (timestamp, nullable), `deleted_at`. Índice: `status`. **Sem `client_id`** — o cliente vem pelo `budget` (não duplicar a FK). Código composto (`Scap 100 - Cot 2`) é calculado, não persistido.

### Transversal
- **files** — `id PK`, `fileable_type`, `fileable_id`, `type` (80), `path`, `original_name`, `mime` (100, nullable), `size` (bigint), `valid_until` (date, nullable), `deleted_at`. Índices: (`fileable_type`,`fileable_id`) e `files_valid_until_index` em `valid_until` (alertas de vencimento do Dashboard — os callers usam `where`, nunca `whereDate`, que cega o índice). Polimórfica — `enforceMorphMap` (ADR-10). `type` = string genérica; o enum vive no domínio (ex.: `RedatorDocumentType`). Anexos de `budgets` e `quotes` também vivem aqui (morphs `budget`/`quote`).
- **audits** — `id PK`, `user_id FK`, `event`, `auditable_type`, `auditable_id`, `old_values`, `new_values`, IP, user-agent. owen-it (ADR-08). Índice `audits_created_at_index` em `created_at` (migration `2026_08_26_000001_add_created_at_index_to_audits_table`) — sem ele o recorte por data da poda varreria a tabela inteira. **Retenção em duas fases**, números em `backend/app/Shared/Retention/RetentionPolicy.php`: aos 12 meses (`AUDITS_ANONIMIZAR_MESES`) `ip_address`/`user_agent`/`url` viram `NULL`, preservando `user_id`/`event`/`auditable_*`/`old_values`/`new_values` (o que o RNF-SEC-04 exige); aos 5 anos (`AUDITS_DESCARTAR_MESES`) a linha inteira é descartada. Executado por `lotus:podar-auditoria` (`PodarAuditoria`), agendado às 03:10 America/Santiago (`routes/console.php`).

### Operation
- **turmas** — `id PK`, `quote_id FK` → quotes `restrictOnDelete`, `course_id FK` → courses (derivado da quote), `modalidade` enum(`presencial`,`online`), `local_aplicacao` (nullable — exigido só se presencial, validado no DTO), `start_date` (date), `end_date` (date), `status` enum(`em_andamento`,`concluida`, default `em_andamento` — no MySQL o enum foi estreitado por `ALTER...MODIFY`; no schema em papel/sqlite ainda carrega `habilitada` como terceiro valor histórico, nunca gravado desde a migration de conclusão), `concluded_at` (timestamp NULL — ato do admin, RN-16), `active_quote_id` (coluna gerada STORED `CASE WHEN deleted_at IS NULL THEN quote_id END`, `UNIQUE`), `deleted_at`. Índices: `status`, (`status`,`end_date`) (painel de emissão) e `start_date` (agenda do Dashboard). Nasce de uma cotação — a unicidade é sobre `active_quote_id`, então 1:1 vale entre turmas **vivas** e uma turma soft-deletada não bloqueia recriar. **Redatores são N:N** via `turma_redator` (spec 6b, D5) — não existe `turmas.redator_id`. **`habilitada` NÃO é estado persistido**: deriva em runtime de doc RN-16 completa (`TurmaHabilitacaoService`, spec 6d D3); conclusão é terminal (D5).
- **turma_redator** — `id PK`, `turma_id FK` → turmas cascade, `redator_id FK` → redatores `restrictOnDelete`, timestamps, `unique(turma_id, redator_id)`. Pivô N:N de designação (quais redatores ministram a turma), sem soft-delete. Pivot não audita sozinho: a designação usa `auditSync`.
- **enrollments** (matrículas) — `id PK`, `turma_id FK` → turmas `restrictOnDelete`, `student_id FK` → students `restrictOnDelete`, `grades` (json, nullable), `attendance_pct` (decimal 5,2, nullable), `approval_status` enum(`pendiente`,`aprobado`,`reprobado`, default `pendiente`), `deleted_at`. Índice único nomeado `enrollments_turma_student_unique` (`turma_id`,`student_id`) — encadear `->unique()` no `foreignId()` não emite índice (lição 6b).

### Certification
- **certificates** — `id PK`, `uuid UK`, `enrollment_id FK` → enrollments `restrictOnDelete`, `course_id FK` → courses `restrictOnDelete`, `redator_id FK` → redatores `restrictOnDelete`, `codigo UK`, `snapshot` (json), `valido_ate` (date, nullable), `status` enum(`emitido`,`revocado`) default `emitido`, `revoked_at` (timestamp, nullable), `revocation_reason` (nullable), timestamps, `active_enrollment_id` (coluna gerada STORED `CASE WHEN status = 'emitido' THEN enrollment_id ELSE NULL END`, `UNIQUE` — índice `certificates_active_enrollment_unique`). **Sem `deleted_at`:** revogação é o próprio "delete" do domínio — `status=revocado` marca e preserva a linha (certificado tem peso legal, não se apaga). A unicidade **não** é um `unique` simples em `enrollment_id`: é sobre `active_enrollment_id`, coluna gerada que vale `enrollment_id` só enquanto `status=emitido` e vira `NULL` quando revogado — mesmo mecanismo de `turmas.active_quote_id` e `student_client_logs.open_link_student_id` (ver acima): um certificado revogado libera a matrícula para reemissão, porque `NULL` não colide em índice único. `snapshot` (json) guarda o retrato dos dados no momento da emissão; não há arquivo por certificado — PDF é gerado sob demanda via Gotenberg (ADR-12), nunca persistido. **Não existe coluna de hash de QR:** a validação pública resolve pelo `uuid`. Índices: (`status`,`valido_ate`) (alertas de vencimento) e `created_at` (ordem default do Historial). A listagem pagina (`GET /api/certificates`, 25 por página, teto 100) desde 2026-08-28 (ADR-22).
- **certificate_sequences** — `id PK`, `year UK` (unsigned smallint), `last_seq` (unsigned int), timestamps. Contador de numeração de `codigo` por ano — sem FK; suporte para gerar o código do certificado sequencialmente (mesmo padrão do `seq_in_budget`/ADR-17: derivado sob lock, nunca input externo).

### RBAC (Spatie — vêm do pacote, não criar à mão)
- **roles** — `id PK`, `name`, `guard_name`.
- **permissions** — `id PK`, `name`, `guard_name`.
- **model_has_roles** — `role_id FK`, `model_type`, `model_id`.
- **model_has_permissions** — `permission_id FK`, `model_type`, `model_id`. Permissão direta a
  usuário, **sem uso**: a autorização é sempre por role (ADR-07). Vem do pacote; não é ponto de
  extensão.
- **role_has_permissions** — `permission_id FK`, `role_id FK`.

### Framework (vêm do Laravel/Sanctum — não são modelo de domínio)
- **sessions** — sustenta o cookie de sessão do Sanctum SPA (ADR-06). `SESSION_DRIVER=database`.
- **password_reset_tokens**, **cache**, **jobs** — padrão do Laravel.
- **personal_access_tokens** — migration default do Sanctum, **morta**: o projeto usa cookie de
  sessão, nunca token (ADR-06). Não usar como saída para "autenticar um serviço".

---

## Tabelas que NÃO existem (e por quê)

> **Nenhuma tabela de domínio segue no papel.** As duas últimas — `certificates` e
> `certificate_sequences` — entraram em 2026-08-05 e estão documentadas em Certification, na seção
> IMPLEMENTADAS. O que sobra aqui é registro de decisão: requisito cujo desenho **não** produz tabela.

### Feedback — sem tabela própria (decisão de 2026-08-22)

Não existe tabela `feedbacks` e não haverá na v2. RF-FBK-01/02/04 são atendidos pela documentação de
turma: `files` polimórfica sobre `turmas`, com `type` restrito por
`Operation\Enums\TurmaDocumentType` — `PRUEBAS` (avaliações dos alunos) e `EVALUACION_REDATOR`
(avaliação do próprio redator), ao lado de `MANUAL`. A exigência de completude antes de finalizar a
turma (RF-FBK-04) é a RN-16, em `ConcludeTurmaAction` sobre `TurmaHabilitacaoService`.

RF-FBK-03 — avaliação do cliente, cadastrada pelo admin ao final da ordem de serviço — segue
**futuro**, junto do resto de RF-TUR-07 (fatura final, comprovante de pagamento). Quando entrar,
entra pelo encerramento da OS, não pela turma.

---

## Relações-chave

- `users` 1:1 → `clients` / `redatores` / `students` (um usuário é UM tipo de ator).
- `clients` 1:N → `client_addresses`, `client_contacts`, `budgets`.
- `students` N:1 → `clients` (vínculo atual em `students.current_client_id`); histórico em `student_client_logs`.
- `courses` 1:N → `course_certificate_templates`, `course_modules`, `course_redator`, `quotes`, `turmas`, `certificates`.
- `redatores` 1:N → `course_redator` (idoneidade); N:N com `turmas` via `turma_redator` (ministra).
- `budgets` 1:N → `quotes` · `quotes` 1:1 → `turmas` (sobre `active_quote_id`) · `turmas` 1:N → `enrollments`.
- `budgets` / `quotes` 1:N → `files` (anexos polimórficos).
- `enrollments` 1:1 → `certificates`.
- `users` 1:N → `model_has_roles`, `audits`.
- **Soft-delete cascateia:** deletar `clients`/`redatores` cascateia até o `users` e os nested (evento `deleting`, guard `isForceDeleting`). Padrão para toda tabela futura com `client_id`/`redator_id`.

---

## Notas de implementação (ligação com ADRs)
- **`files` e `audits` são polimórficas** → `enforceMorphMap` obrigatório (ADR-10). Registrar alias só de classe que existe.
- **`certificates`**: sem arquivo por aluno; só metadata. PDF sob demanda via Gotenberg (ADR-12).
- **Soft delete** nas entidades de negócio (`deleted_at`).
- **RUT único** em `users.rut` (validação = `ValidRut` de estrutura + `unique:users,rut` com `withTrashed` no check).
- **Status derivado, não persistido:** `budgets` não tem coluna `status`/`total` — o `BudgetSummaryService` deriva das cotações (bcmath). Ao criar tabela futura, não "cachear" agregado sem necessidade real.
- **Coleção nested no DTO é `Optional`, não `array = []`** (ADR-04/lição do Bloco 5): em
  `CourseData`, `templates`/`modules` ausentes do payload significam "não mexe"; `[]` apaga. Um
  default `[]` fazia o replace-total da Action apagar a coleção de quem só omitiu o campo — em
  silêncio. Toda coleção nested read-write futura nasce `Optional`.
  Desde 2026-08-13 a lei tem mecanismo, e não só convenção:
  `tests/Feature/Shared/PersistenceLawsTest.php` reprova coleção nested sem `Optional`, e projeção
  de saída se declara com `#[ReadOnlyCollection]` em vez de entrar numa allowlist.
- **Contexto total:** 27 tabelas — 20 de domínio, **todas implementadas** + 7 RBAC/transversal (as
  5 do Spatie mais `files` e `audits`, que esta lista classifica como Transversal). O número caiu de
  28 para 27 no merge de 2026-08-22: `feedbacks` era a única "no papel" e deixou de existir como
  tabela por decisão do `feedbacks-resolver-escopo` (ver `### Feedback` acima). Implementadas:
  users, clients, client_addresses, client_contacts, redatores, **students**,
  **student_client_logs**, **login_logs**, **invitation_tokens**, courses,
  course_certificate_templates, course_modules, course_redator, budgets, quotes, files, audits,
  **turmas**, **turma_redator**, **enrollments**, **certificates**, **certificate_sequences** + as 5
  de RBAC. `invitation_tokens` (`2026_08_18_200000`) ainda não tem ficha de colunas nesta lista —
  é a **P-52**. As de framework (sessions, cache, cache_locks, jobs, job_batches, failed_jobs,
  password_reset_tokens, personal_access_tokens) ficam fora da contagem de domínio.
