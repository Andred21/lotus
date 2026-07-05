# DER Físico (MySQL) — Lotus

> Snapshot de 2026-07-04. Fonte canônica: `Drive/V2/Planejamento/3-avancado/modelo-fisico-e-diagramas.md`.
> DER FÍSICO: com tipos MySQL, PK/FK, índices. Difere do modelo conceitual (camada intermediária, sem tipos).
> **Consulte antes de criar migration, model ou mexer em schema.** Os nomes aqui são a referência — não invente nomes divergentes.
>
> Correções da dívida da v1 aplicadas: AUTO_INCREMENT, tamanho de password/token, timestamps padrão, soft delete, ENUMs sem typo, política de FK.

---

## Tabelas por domínio

### Identity
- **users** — `id PK`, `uuid UK`, `name`, `rut UK`, `email UK`, `password`, `type` (enum), `is_active` (tinyint), `deleted_at`. Só admin/redator autenticam (RN-01).
- **clients** — `id PK`, `user_id FK`, `razao_social`, `tipo` (enum), `rut_empresa UK`. 1:1 com users.
- **client_addresses** — `id PK`, `client_id FK`, `comuna`, `ciudad`, `region`.
- **client_contacts** — `id PK`, `client_id FK`, `name`, `email`.
- **redatores** — `id PK`, `user_id FK`. 1:1 com users.
- **students** — `id PK`, `user_id FK`, `current_client_id FK`. 1:1 com users.

### Catalog
- **courses** — `id PK`, `name`, `carga_horaria` (smallint).
- **course_certificate_templates** — `id PK`, `course_id FK`, `version` (int), `layout_config` (json), `vigencia_meses` (smallint).
- **course_redator** — `id PK`, `course_id FK`, `redator_id FK`. (Idoneidade: quais redatores podem ministrar cada curso.)

### Commercial
- **budgets** (orçamentos) — `id PK`, `client_id FK`, `valor_total_uf` (decimal), `status` (enum). Agrupa N cotações.
- **quotes** (cotações) — `id PK`, `budget_id FK`, `client_id FK`, `course_id FK`, `qtd_alunos` (int), `valor_uf` (decimal), `status` (enum).

### Operation
- **student_client_logs** — `id PK`, `student_id FK`, `client_id FK`, `data_inicio` (date), `data_fim` (date), `active_student_id` (bigint, generated). Histórico de vínculo aluno↔cliente.
- **turmas** — `id PK`, `quote_id FK,UK`, `course_id FK`, `redator_id FK`, `modalidade` (enum), `status` (enum). Uma turma nasce de uma cotação (1:1). Um redator por turma.
- **enrollments** (matrículas) — `id PK`, `student_id FK`, `turma_id FK`, `notas` (json), `presenca_pct` (decimal), `status_aprovacao` (enum).

### Certification
- **certificates** — `id PK`, `uuid UK`, `enrollment_id FK,UK`, `course_id FK`, `codigo UK`, `valido_ate` (date), `qr_code_hash UK`, `status` (enum). Gerado sob demanda; metadata armazenada, PDF não.
- **certificate_sequences** — `id PK`, `year UK` (smallint), `last_seq` (int). Sequência de numeração por ano.

### Feedback
- **feedbacks** — `id PK`, `turma_id FK`, `origem` (enum).

### Transversal
- **files** — `id PK`, `fileable_type` (varchar), `fileable_id` (bigint), `tipo`, `path`, `valido_ate` (date). Polimórfica — usar enforceMorphMap (ADR-10).
- **audits** — `id PK`, `user_id FK`, `event`, `auditable_type`, `auditable_id`, `old_values` (text), `new_values` (text). owen-it (ADR-08).

### RBAC (Spatie — não criar à mão, vêm do pacote)
- **roles** — `id PK`, `name`, `guard_name`.
- **permissions** — `id PK`, `name`, `guard_name`.
- **model_has_roles** — `role_id FK`, `model_type`, `model_id`.
- **role_has_permissions** — `permission_id FK`, `role_id FK`.

---

## Relações-chave

- `users` 1:1 → `clients` / `redatores` / `students` (um usuário é UM tipo de ator).
- `clients` 1:N → `client_addresses`, `client_contacts`, `budgets`.
- `students` N:1 → `clients` (vínculo atual `current`); histórico em `student_client_logs`.
- `courses` 1:N → `quotes`, `course_certificate_templates`, `course_redator`, `turmas`, `certificates`.
- `redatores` 1:N → `course_redator` (idoneidade), `turmas` (ministra).
- `budgets` 1:N → `quotes` ("agrupa").
- `quotes` 1:1 → `turmas` ("vira").
- `turmas` 1:N → `enrollments`, `feedbacks`.
- `students` 1:N → `enrollments`.
- `enrollments` 1:1 → `certificates`.
- `users` 1:N → `model_has_roles`, `audits`.

---

## Notas de implementação (ligação com ADRs)
- **`files` e `audits` são polimórficas** → `enforceMorphMap` obrigatório (ADR-10).
- **`certificates`**: não há arquivo por aluno; só metadata. PDF gerado sob demanda via Gotenberg (ADR-12).
- **Soft delete** nas entidades de negócio (`deleted_at`).
- **RUT único** em `users.rut` e `clients.rut_empresa`.
- **Contexto total:** 24 tabelas (18 de domínio + 6 RBAC/transversal).
