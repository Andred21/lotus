# Bloco 5.4 · Refino frontend Administração — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar os 5 achados aprovados do review de Administração (C-1 estado de erro, C-2 toolbar contextual, C-3 grupos i18n, B-1/ui campo Tipo, (b) descrições i18n) sem mudar comportamento de negócio.

**Architecture:** Frontend-only. Nenhum backend tocado exceto 1 comentário dev-only em `PermissionCatalog`. Nenhum regen de tipo (`generated.ts` intacto). Cada task é auto-contida e termina em `pnpm lint` + `pnpm build` verdes; a verificação comportamental (lei §8) é a Task 6 no `pnpm dev`.

**Tech Stack:** React 19 + TS, Vite, PrimeReact via `shared/ui`, Tailwind v4 (layout), i18next (3 locales).

## Global Constraints

- **Frontend-only.** Único toque de backend permitido: 1 comentário doc-only em `PermissionCatalog.php`.
- **`generated.ts` NÃO se edita** (lei §5.3). Nenhuma task regenera tipo — o DTO fica intacto.
- **3 locales com chaves IDÊNTICAS** (`es-CL`, `pt-BR`, `en`). `es-CL` é a referência de rótulo.
- **Features importam só via `@shared/ui`** (lei §6) — nunca PrimeReact direto.
- **Tailwind = layout**; cor via variável de tema (ADR-16) — nenhuma cor hardcoded.
- **Sem test runner no frontend.** Gate por task = `pnpm lint` + `pnpm build`. DoD = gate + verificação visual (Task 6).
- Todos os comandos rodam de `frontend/` (nativo no WSL — Node 22/pnpm).

---

### Task 1: C-2 — Toolbar contextual por aba na AdministracionPage

Espelha o molde de módulo tabbed do `CommercialPage` (unificado no commit `b883b6b`): header com ação que troca conforme a aba ativa, sem botão solto dentro da aba.

**Files:**
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx`

**Interfaces:**
- Consumes: `useUsersPage()` (`.openCreate`, `.items`, `.loading`, `.openView`, `.dialog`, `.close`, `.startEdit`), `useRolesPage()` (idem), `ModuleTabs`/`ModuleTab` (aceitam `activeIndex`/`onTabChange`, provado no `CommercialPage`).
- Produces: nada consumido por outra task.

- [ ] **Step 1: Adicionar o import de `useState`**

Substituir a primeira linha:

```tsx
import { useTranslation } from 'react-i18next'
```

por:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
```

- [ ] **Step 2: Estado da aba + ação de header contextual + remover botão in-tab**

Substituir o bloco que vai de `const page = useUsersPage()` até o fechamento de `</ModuleTabs>`:

```tsx
  const page = useUsersPage()
  const rolesPage = useRolesPage()

  return (
    <ModulePage
      title={t('admin.module')}
      description={t('admin.moduleDescription')}
      actions={canManage ? <AppButton variant="brandIcon" label={t('admin.new')} icon="pi pi-user-plus" onClick={page.openCreate} /> : null}
    >
      <ModuleTabs>
        <ModuleTab header={t('admin.tabUsers')}>
          <UsersTable users={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
        {canManage && (
          <ModuleTab header={t('admin.tabRoles')}>
            <div className="space-y-3">
              <div className="flex justify-end">
                <AppButton variant="brandIcon" label={t('role.new')} icon="pi pi-plus" onClick={rolesPage.openCreate} />
              </div>
              <RolesTable roles={rolesPage.items} loading={rolesPage.loading} onView={rolesPage.openView} />
            </div>
          </ModuleTab>
        )}
      </ModuleTabs>
```

por:

```tsx
  const page = useUsersPage()
  const rolesPage = useRolesPage()
  const [tab, setTab] = useState(0)

  const onRoles = tab === 1

  return (
    <ModulePage
      title={t('admin.module')}
      description={t('admin.moduleDescription')}
      actions={
        canManage ? (
          onRoles ? (
            <AppButton variant="brandIcon" label={t('role.new')} icon="pi pi-plus" onClick={rolesPage.openCreate} />
          ) : (
            <AppButton variant="brandIcon" label={t('admin.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
          )
        ) : null
      }
    >
      <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
        <ModuleTab header={t('admin.tabUsers')}>
          <UsersTable users={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
        {canManage && (
          <ModuleTab header={t('admin.tabRoles')}>
            <RolesTable roles={rolesPage.items} loading={rolesPage.loading} onView={rolesPage.openView} />
          </ModuleTab>
        )}
      </ModuleTabs>
```

- [ ] **Step 3: Lint + build**

Run (de `frontend/`): `pnpm lint && pnpm build`
Expected: ambos verdes, sem erro de `tab`/`setTab`/`onTabChange`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/components/AdministracionPage.tsx
git commit -m "feat(identity): toolbar contextual por aba na Administração (molde CommercialPage)"
```

---

### Task 2: C-3 + (b) — Chaves i18n `permGroup.*` e `perm.*` nos 3 locales

Cria os rótulos que a Task 3 (RoleDialog) vai consumir. **Roda ANTES da Task 3** — senão o picker renderiza a chave crua. PT = cópia literal das descrições de `PermissionCatalog::descriptions()`; es-CL/en draftados (João revisa es-CL na execução; ponto de atenção: vocabulário `redator`/`turma`).

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces: chaves `permGroup.{identity,commercial,catalog,operation,certification,feedback}` e `perm.<name_com_underscore>` (35 entradas) nos 3 locales — consumidas pela Task 3.

- [ ] **Step 1: Inserir os blocos em `es-CL.json`**

Localizar a linha `  "role": {` (2 espaços de indentação, com `{`) e inserir ANTES dela:

```json
  "permGroup": {
    "identity": "Identidad",
    "commercial": "Comercial",
    "catalog": "Catálogo",
    "operation": "Operación",
    "certification": "Certificación",
    "feedback": "Retroalimentación"
  },
  "perm": {
    "identity_user_view": "Ver usuarios y redactores",
    "identity_user_create": "Crear usuarios y redactores",
    "identity_user_update": "Editar usuarios y redactores",
    "identity_user_delete": "Eliminar (soft delete) usuarios",
    "identity_access_manage": "Gestionar roles y permisos de otros usuarios (sensible)",
    "commercial_client_view": "Ver clientes (empresas contratantes)",
    "commercial_client_create": "Crear clientes",
    "commercial_client_update": "Editar clientes, direcciones y contactos",
    "commercial_client_delete": "Eliminar clientes",
    "commercial_budget_view": "Ver presupuestos",
    "commercial_budget_create": "Crear presupuestos",
    "commercial_budget_update": "Editar presupuestos",
    "commercial_budget_delete": "Eliminar presupuestos",
    "commercial_quote_view": "Ver cotizaciones",
    "commercial_quote_create": "Crear cotizaciones",
    "commercial_quote_update": "Editar cotizaciones",
    "commercial_quote_delete": "Eliminar cotizaciones",
    "commercial_quote_approve": "Aprobar cotización con aceptación del cliente (Flujo 2 — solo superadmin)",
    "catalog_course_view": "Ver cursos y plantillas de certificado",
    "catalog_course_create": "Crear cursos",
    "catalog_course_update": "Editar cursos, plantillas y habilitación de redactores",
    "catalog_course_delete": "Eliminar cursos",
    "operation_turma_view": "Ver grupos",
    "operation_turma_create": "Crear grupos",
    "operation_turma_update": "Editar grupos",
    "operation_turma_delete": "Eliminar grupos",
    "operation_enrollment_manage": "Matricular alumnos / importar planilla (Flujo 3)",
    "operation_turma_assign_redator": "Asignar redactor idóneo al grupo (Flujo 3)",
    "operation_turma_complete": "Confirmar finalización del grupo (Flujo 4 — admin confirma)",
    "operation_turma_submit_docs": "Subir documentación del grupo (Flujo 1/4 — acción del redactor)",
    "certification_certificate_view": "Ver certificados",
    "certification_certificate_issue": "Emitir certificado (Flujo 5)",
    "certification_certificate_revoke": "Revocar certificado (Flujo 6 — sensible, peso legal)",
    "feedback_feedback_view": "Ver retroalimentaciones del grupo",
    "feedback_feedback_manage": "Gestionar retroalimentaciones del grupo"
  },
  "role": {
```

- [ ] **Step 2: Inserir os blocos em `pt-BR.json`** (PT = cópia literal do catálogo)

Mesma âncora (`  "role": {`), inserir ANTES:

```json
  "permGroup": {
    "identity": "Identidade",
    "commercial": "Comercial",
    "catalog": "Catálogo",
    "operation": "Operação",
    "certification": "Certificação",
    "feedback": "Feedback"
  },
  "perm": {
    "identity_user_view": "Ver usuários e redatores",
    "identity_user_create": "Criar usuários e redatores",
    "identity_user_update": "Editar usuários e redatores",
    "identity_user_delete": "Remover (soft delete) usuários",
    "identity_access_manage": "Gerir roles e permissões de outros usuários (sensível)",
    "commercial_client_view": "Ver clientes (empresas contratantes)",
    "commercial_client_create": "Criar clientes",
    "commercial_client_update": "Editar clientes, endereços e contatos",
    "commercial_client_delete": "Remover clientes",
    "commercial_budget_view": "Ver orçamentos",
    "commercial_budget_create": "Criar orçamentos",
    "commercial_budget_update": "Editar orçamentos",
    "commercial_budget_delete": "Remover orçamentos",
    "commercial_quote_view": "Ver cotações",
    "commercial_quote_create": "Criar cotações",
    "commercial_quote_update": "Editar cotações",
    "commercial_quote_delete": "Remover cotações",
    "commercial_quote_approve": "Aprovar cotação com aceite do cliente (Fluxo 2 — só superadmin)",
    "catalog_course_view": "Ver cursos e templates de certificado",
    "catalog_course_create": "Criar cursos",
    "catalog_course_update": "Editar cursos, templates e habilitação de redatores",
    "catalog_course_delete": "Remover cursos",
    "operation_turma_view": "Ver turmas",
    "operation_turma_create": "Criar turmas",
    "operation_turma_update": "Editar turmas",
    "operation_turma_delete": "Remover turmas",
    "operation_enrollment_manage": "Matricular alunos / importar planilha (Fluxo 3)",
    "operation_turma_assign_redator": "Designar redator idôneo à turma (Fluxo 3)",
    "operation_turma_complete": "Confirmar conclusão da turma (Fluxo 4 — admin confirma)",
    "operation_turma_submit_docs": "Subir documentação da turma (Fluxo 1/4 — ação do redator)",
    "certification_certificate_view": "Ver certificados",
    "certification_certificate_issue": "Emitir certificado (Fluxo 5)",
    "certification_certificate_revoke": "Revogar certificado (Fluxo 6 — sensível, peso legal)",
    "feedback_feedback_view": "Ver feedbacks de turma",
    "feedback_feedback_manage": "Gerir feedbacks de turma"
  },
  "role": {
```

- [ ] **Step 3: Inserir os blocos em `en.json`**

Mesma âncora (`  "role": {`), inserir ANTES:

```json
  "permGroup": {
    "identity": "Identity",
    "commercial": "Commercial",
    "catalog": "Catalog",
    "operation": "Operation",
    "certification": "Certification",
    "feedback": "Feedback"
  },
  "perm": {
    "identity_user_view": "View users and editors",
    "identity_user_create": "Create users and editors",
    "identity_user_update": "Edit users and editors",
    "identity_user_delete": "Remove (soft delete) users",
    "identity_access_manage": "Manage other users' roles and permissions (sensitive)",
    "commercial_client_view": "View clients (contracting companies)",
    "commercial_client_create": "Create clients",
    "commercial_client_update": "Edit clients, addresses and contacts",
    "commercial_client_delete": "Remove clients",
    "commercial_budget_view": "View budgets",
    "commercial_budget_create": "Create budgets",
    "commercial_budget_update": "Edit budgets",
    "commercial_budget_delete": "Remove budgets",
    "commercial_quote_view": "View quotes",
    "commercial_quote_create": "Create quotes",
    "commercial_quote_update": "Edit quotes",
    "commercial_quote_delete": "Remove quotes",
    "commercial_quote_approve": "Approve quote with client acceptance (Flow 2 — superadmin only)",
    "catalog_course_view": "View courses and certificate templates",
    "catalog_course_create": "Create courses",
    "catalog_course_update": "Edit courses, templates and editor enablement",
    "catalog_course_delete": "Remove courses",
    "operation_turma_view": "View classes",
    "operation_turma_create": "Create classes",
    "operation_turma_update": "Edit classes",
    "operation_turma_delete": "Remove classes",
    "operation_enrollment_manage": "Enroll students / import spreadsheet (Flow 3)",
    "operation_turma_assign_redator": "Assign a qualified editor to the class (Flow 3)",
    "operation_turma_complete": "Confirm class completion (Flow 4 — admin confirms)",
    "operation_turma_submit_docs": "Upload class documentation (Flow 1/4 — editor action)",
    "certification_certificate_view": "View certificates",
    "certification_certificate_issue": "Issue certificate (Flow 5)",
    "certification_certificate_revoke": "Revoke certificate (Flow 6 — sensitive, legal weight)",
    "feedback_feedback_view": "View class feedback",
    "feedback_feedback_manage": "Manage class feedback"
  },
  "role": {
```

- [ ] **Step 4: Validar JSON + chaves idênticas**

Run (de `frontend/`):

```bash
python3 -c "
import json
locs = {f: json.load(open(f'src/shared/config/locales/{f}.json')) for f in ('es-CL','pt-BR','en')}
pg = [set(d['permGroup']) for d in locs.values()]
pm = [set(d['perm']) for d in locs.values()]
assert pg[0]==pg[1]==pg[2], 'permGroup diverge'
assert pm[0]==pm[1]==pm[2], 'perm diverge'
assert len(pm[0])==35, f'esperado 35 perms, achou {len(pm[0])}'
print('OK — permGroup e perm idênticos nos 3 locales; 35 perms')
"
```

Expected: `OK — permGroup e perm idênticos nos 3 locales; 35 perms`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/en.json
git commit -m "i18n(identity): rótulos permGroup.* e perm.* nos 3 locales (grupos + descrições de permissão)"
```

---

### Task 3: C-1 + C-3 + (b) — RoleDialog: erro visível, grupo e descrição traduzidos

Três edições no `RoleDialog`, todas em regiões distintas. **Depende da Task 2** (chaves `permGroup.*`/`perm.*`).

**Files:**
- Modify: `frontend/src/features/identity/components/Admin/RoleDialog.tsx`

**Interfaces:**
- Consumes: `FormErrorSummary` de `@shared/ui`; `fieldErrors` (já retornado por `useRoleForm`); chaves i18n da Task 2; `p.name`/`p.group` de `PermissionData`.

- [ ] **Step 1: Adicionar `FormErrorSummary` ao import de `@shared/ui`**

Substituir:

```tsx
import { CrudDialog, AppInputText, AppCheckbox, FormField, FormErrorBanner } from '@shared/ui'
```

por:

```tsx
import { CrudDialog, AppInputText, AppCheckbox, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 2: C-1 — summary de erro após o banner**

Substituir:

```tsx
      <FormErrorBanner message={generalError} />

      <section className="space-y-4">
```

por:

```tsx
      <FormErrorBanner message={generalError} />
      {/* `name` mostra o próprio erro no FormField; um 422 keyed `permissions`
          (assertAssignable) ou `permissions.N` (DTO) não tem input onde pendurar
          — sem isto o save falha em silêncio. */}
      <FormErrorSummary errors={fieldErrors} mapped={['name']} />

      <section className="space-y-4">
```

- [ ] **Step 3: C-3 — grupo via i18n (remove o slug cru)**

Substituir:

```tsx
              <p className="text-xs font-medium capitalize text-slate-400">{group}</p>
```

por:

```tsx
              <p className="text-xs font-medium text-slate-400">{t(`permGroup.${group}`)}</p>
```

- [ ] **Step 4: (b) — descrição via i18n (underscore transform)**

Substituir:

```tsx
                    <span>{p.description}</span>
```

por:

```tsx
                    <span>{t(`perm.${p.name.replace(/\./g, '_')}`)}</span>
```

`replace(/\./g, '_')` (regex global) em vez de `replaceAll` — evita depender do `lib` ES2021 do tsconfig.

- [ ] **Step 5: Lint + build**

Run (de `frontend/`): `pnpm lint && pnpm build`
Expected: ambos verdes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/components/Admin/RoleDialog.tsx
git commit -m "feat(identity): RoleDialog — erro de permissão visível (C-1) + grupo/descrição i18n (C-3/b)"
```

---

### Task 4: C-1 + B-1/ui — StaffUserDialog: erro visível + campo Tipo como tag

**Files:**
- Modify: `frontend/src/features/identity/components/Admin/StaffUserDialog.tsx`

**Interfaces:**
- Consumes: `FormErrorSummary` e `AppTag` de `@shared/ui`; `fieldErrors` (já retornado por `useStaffUserForm`).

- [ ] **Step 1: Adicionar `AppTag` e `FormErrorSummary` ao import**

Substituir:

```tsx
import { CrudDialog, AppInputText, AppPassword, AppDropdown, FormField, FormErrorBanner } from '@shared/ui'
```

por:

```tsx
import { CrudDialog, AppInputText, AppPassword, AppDropdown, AppTag, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 2: C-1 — summary de erro após o banner**

Substituir:

```tsx
      <FormErrorBanner message={generalError} />

      <section className="space-y-4">
```

por:

```tsx
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} mapped={['name', 'rut', 'email', 'password', 'role']} />

      <section className="space-y-4">
```

- [ ] **Step 3: B-1/ui — campo Tipo vira `AppTag`**

Substituir:

```tsx
          {/* type é sempre 'admin' para staff — read-only, reforça a distinção type vs role */}
          <FormField label={t('admin.type')}>
            <AppInputText value={t('admin.typeAdmin')} disabled className="w-full" />
          </FormField>
```

por:

```tsx
          {/* type é sempre 'admin' para staff — atributo fixo, não editável.
              Tag em vez de input desabilitado: sinaliza "valor imutável", não
              "campo editável acinzentado". */}
          <FormField label={t('admin.type')}>
            <AppTag value={t('admin.typeAdmin')} severity="info" />
          </FormField>
```

- [ ] **Step 4: Lint + build**

Run (de `frontend/`): `pnpm lint && pnpm build`
Expected: ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/identity/components/Admin/StaffUserDialog.tsx
git commit -m "feat(identity): StaffUserDialog — erro visível (C-1) + campo Tipo como tag (B-1/ui)"
```

---

### Task 5: (b) — Comentário dev-only em PermissionCatalog

Marca que a `description` deixou de ser user-facing (o texto agora mora nos locales `perm.*`). Doc-only: nenhuma mudança de comportamento, nenhum consumidor afetado (o seeder só lê `array_keys`).

**Files:**
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php`

**Interfaces:** nenhuma — só comentário.

- [ ] **Step 1: Anotar o método `descriptions()`**

Substituir:

```php
    /** Catálogo canônico: nome da permissão => descrição. */
    public static function descriptions(): array
```

por:

```php
    /**
     * Catálogo canônico: nome da permissão => descrição.
     *
     * A `description` aqui é DEV-FACING (documenta o catálogo). O texto
     * user-facing do picker vem dos locales do front (`perm.<name>`, Bloco 5.4):
     * a UI é es-CL e a i18n é do front (ADR-15). O seeder só consome `array_keys`.
     */
    public static function descriptions(): array
```

- [ ] **Step 2: Provar que o backend não quebrou**

Run: `docker compose exec -T app php artisan test --filter=PermissionCatalogTest`
Expected: PASS (o comentário não muda comportamento; o teste do catálogo continua verde).

- [ ] **Step 3: Commit**

```bash
git add backend/app/Domains/Identity/Support/PermissionCatalog.php
git commit -m "docs(identity): PermissionCatalog.description é dev-facing (texto user-facing nos locales)"
```

---

### Task 6: Verificação visual integrada (DoD — lei §8)

Build verde não é aceite. Prova o comportamento das 4 telas afetadas no app rodando.

**Files:** nenhum (verificação).

- [ ] **Step 1: Gate estático**

Run (de `frontend/`): `pnpm lint && pnpm build`
Expected: ambos verdes.

- [ ] **Step 2: Subir o dev server**

Run (de `frontend/`): `pnpm dev` (e o backend via `docker compose up -d` se não estiver de pé).
Logar como **superadmin** e ir em `/administracion`.

- [ ] **Step 3: Provar C-2 (toolbar contextual)**

Na aba **Usuarios**, o botão do header lê "Nuevo usuario". Trocar para a aba **Roles y permisos**: o botão do header passa a "Nuevo rol" e **não há** um segundo botão dentro da aba.
Expected: uma só ação por aba, contextual.

- [ ] **Step 4: Provar C-1 (erro visível) — o item de maior peso**

Aba Roles → criar role → nomear com um nome que já existe (ex.: `superadmin`) → salvar.
Expected: a mensagem "Já existe uma role com esse nome." aparece no topo do diálogo (antes desta task: o botão parava de girar e nada aparecia).

- [ ] **Step 5: Provar C-3 + (b) (grupos e descrições em espanhol)**

Abrir o diálogo de role → o picker de permissões mostra os grupos como "Identidad", "Comercial", "Operación"… (não "Identity"/"Operation") e as descrições em espanhol (não em PT). Trocar o idioma no seletor → os rótulos acompanham.
Expected: zero texto inglês/PT cru no picker em es-CL.

- [ ] **Step 6: Provar B-1/ui (campo Tipo)**

Abrir o diálogo de usuário staff → o campo "Tipo" aparece como uma tag "Admin" (info), não como um input acinzentado.
Expected: afordância de atributo fixo.

- [ ] **Step 7: Fechar**

Sem regressão visual nas telas. DoD atendido. Próximo passo é o gate de fechamento (`/fechar-sprint`), fora deste plano.

---

## Ordem e dependências

- **Task 2 antes da Task 3** (as chaves i18n precisam existir antes do RoleDialog consumi-las).
- Tasks 1, 4, 5 são independentes entre si e das demais.
- Task 6 roda por último (verifica tudo junto).

## Pontos de atenção para o executor

- **Vocabulário es-CL** (Task 2): `turma` foi draftado como "grupo" e `redator` como "redactor" — o João revisa. É o item de vocabulário mais provável de ajuste.
- **Anchor dos locales** (Task 2): `  "role": {` com 2 espaços e `{` é único em cada arquivo (a outra ocorrência, `"role": "Rol"` dentro de `admin`, tem 4 espaços e valor string — não casa).
