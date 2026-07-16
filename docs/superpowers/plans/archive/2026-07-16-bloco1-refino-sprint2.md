# Bloco 1 · Refino de código Sprint 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a duplicação de UI de formulário e mover a regra de delete comercial para Actions, sem mudar comportamento observável.

**Architecture:** (1) Extrair 4 primitivos de formulário para `shared/ui/FormField/` e trocar as redefinições locais nos 6 consumidores por imports do barrel. (2) Extrair `DeleteBudgetAction`/`DeleteQuoteAction`, deixando os controllers finos (ADR-02). (3) Documentar a convenção `from()`/`fromModel()` em INSTRUÇÕES-DO-PROJETO.md.

**Tech Stack:** React 19 + TS (Vite, sem test runner — gate = `pnpm build` type-check + `pnpm lint`); Laravel 13 / PHP 8.3 (testes de integração sqlite `:memory:`, Pint).

## Global Constraints

- **Spec fonte:** `docs/superpowers/specs/2026-07-16-bloco1-refino-sprint2-design.md`.
- **Kit é puro-apresentacional:** recebe strings já traduzidas, não chama `t()` (regra dos wrappers `shared/ui`).
- **API 1:1 com o código atual** (`error?: string` = primeira mensagem) — migração mecânica.
- **Único desvio de comportamento permitido:** `role="alert"` passa a valer para todos os banners (a11y). Registrar em `.superpowers/sdd/progress.md`.
- **Features importam SÓ do barrel `@shared/ui`**, nunca caminho fundo nem `primereact` (ADR-05).
- **Barrel:** um `export * from './X'` por pasta em `shared/ui/index.ts`.
- **Backend:** regra de escrita → Action; `ValidationException::withMessages([...])` (nunca `abort(422)`); controllers deixam exceções subirem (ADR-02/03). `DB::transaction` só onde há múltiplas escritas (Budget cascateia; Quote não).
- **Escopo travado:** `ClientController::destroy` NÃO muda; sem `DeleteClientAction`.
- **Git:** WIP do João é intocável (`.claude/commands/fechar-sprint.md`, `docs/superpowers/progress.md` estão sujos). `git add` só os caminhos de cada task. Antes de editar qualquer arquivo, `git status` + Read fresco.
- **Comandos:** frontend nativo em `frontend/` (`pnpm build`, `pnpm lint`); backend no container (`docker compose exec -T app php artisan test ...`); Pint SEMPRE com argumento (nunca no repo inteiro).
- **DoD = comportamento provado end-to-end contra a API real**, não build/test verde (CLAUDE.md §4).

---

## Task 1: Kit de formulário em `shared/ui/FormField/`

**Files:**
- Create: `frontend/src/shared/ui/FormField/FormField.tsx`
- Create: `frontend/src/shared/ui/FormField/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Produces (consumidos pelas Tasks 2-5):
  - `FormField({ label: string; error?: string; children: ReactNode })`
  - `NestedField({ error?: string; children: ReactNode })`
  - `FormErrorSummary({ errors?: Record<string,string[]> | null; mapped: string[]; excludePrefixes?: string[] })`
  - `FormErrorBanner({ message?: string | null; variant?: 'box' | 'inline' })`
  - Tipos: `FormFieldProps`, `NestedFieldProps`, `FormErrorSummaryProps`, `FormErrorBannerProps`

- [ ] **Step 1: Criar `FormField.tsx`**

Arquivo `frontend/src/shared/ui/FormField/FormField.tsx`:

```tsx
import type { ReactNode } from 'react'

export type FormFieldProps = {
  label: string
  error?: string
  children: ReactNode
}

/** Campo de formulário: label + controle + mensagem de erro do backend. */
export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

export type NestedFieldProps = {
  error?: string
  children: ReactNode
}

/** Campo aninhado (linhas de contato/endereço/módulo): sem label própria, mas
 * com o erro do backend visível. Sem isso, um 422 em `contacts.0.name` deixa o
 * botão de salvar aparentemente inerte. */
export function NestedField({ error, children }: NestedFieldProps) {
  return (
    <div>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </div>
  )
}

export type FormErrorSummaryProps = {
  errors?: Record<string, string[]> | null
  /** Campos que TÊM input na tela (já mostram o próprio erro). */
  mapped: string[]
  /** Prefixos de chave a ignorar porque já aparecem noutro lugar (ex.:
   * `['contacts.']` quando cada contato mostra o próprio erro num NestedField). */
  excludePrefixes?: string[]
}

/** Resumo dos 422 cujo campo não tem input na tela — sem ele, um erro fora dos
 * campos visíveis some e o botão de salvar parece inerte. */
export function FormErrorSummary({ errors, mapped, excludePrefixes = [] }: FormErrorSummaryProps) {
  if (!errors) return null
  const leftover = Object.entries(errors).filter(
    ([key]) => !mapped.includes(key) && !excludePrefixes.some((p) => key.startsWith(p)),
  )
  if (leftover.length === 0) return null
  return (
    <ul className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {leftover.map(([key, msgs]) => (
        <li key={key}>{msgs[0]}</li>
      ))}
    </ul>
  )
}

export type FormErrorBannerProps = {
  message?: string | null
  variant?: 'box' | 'inline'
}

/** Banner de erro geral (não-422, ou 422 sem campo na tela). `role="alert"` para
 * leitor de tela. `box` (default) = caixa vermelha dos diálogos; `inline` =
 * texto sem caixa (formulário de login). */
export function FormErrorBanner({ message, variant = 'box' }: FormErrorBannerProps) {
  if (!message) return null
  if (variant === 'inline') {
    return (
      <div role="alert" className="text-sm text-red-600 dark:text-red-400">
        {message}
      </div>
    )
  }
  return (
    <p role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {message}
    </p>
  )
}
```

- [ ] **Step 2: Criar `index.ts` do componente**

Arquivo `frontend/src/shared/ui/FormField/index.ts` (segue o molde de `ModulePage/index.ts` — múltiplos exports por pasta):

```ts
export { FormField, NestedField, FormErrorSummary, FormErrorBanner } from './FormField'
export type {
  FormFieldProps,
  NestedFieldProps,
  FormErrorSummaryProps,
  FormErrorBannerProps,
} from './FormField'
```

- [ ] **Step 3: Registrar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, adicionar a linha (ordem alfabética, perto de `CrudDialog`):

```ts
export * from './FormField'
```

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS (kit compila; símbolos exportados não disparam `noUnusedLocals`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/FormField/ frontend/src/shared/ui/index.ts
git commit -m "feat(shared/ui): kit de form (FormField, NestedField, FormErrorSummary, FormErrorBanner)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Migrar `ClientDialog` para o kit

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`

**Interfaces:**
- Consumes: `FormField`, `NestedField`, `FormErrorSummary`, `FormErrorBanner` (Task 1)

O caso mais completo: usa os 4 primitivos. Preserva `patchContact` (helper de estado, não é kit) e o comentário de negócio sobre `addresses.*` NÃO ser excluído.

- [ ] **Step 1: `git status` + Read fresco do arquivo**

Run: `git status --short frontend/src/features/commercial/components/Client/ClientDialog.tsx`
Se sujo, `git diff` antes de editar. Depois Read o arquivo inteiro.

- [ ] **Step 2: Ajustar imports**

Trocar:
```tsx
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppDropdown } from '@shared/ui'
```
por (remove `ReactNode` — só Field/NestedField locais o usavam; mantém `Dispatch`/`SetStateAction` de `patchContact`):
```tsx
import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppDropdown, FormField, NestedField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 3: Trocar o banner de `generalError`**

Trocar o bloco:
```tsx
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}
```
por:
```tsx
      <FormErrorBanner message={generalError} />
```

- [ ] **Step 4: Trocar `UnmappedErrors` por `FormErrorSummary` (com `excludePrefixes`)**

Trocar o bloco:
```tsx
      {fieldErrors && (
        <UnmappedErrors
          errors={fieldErrors}
          mapped={['legal_name', 'name', 'rut', 'email', 'type', 'business_activity']}
        />
      )}
```
por (o comentário sobre `contacts.*`/`addresses.*` vive agora aqui, resumido):
```tsx
      {/* `contacts.*` sai do resumo (cada contato mostra o próprio erro no
          NestedField); `addresses.*` NÃO — hoje o backend não valida endereço,
          mas quando validar o 422 não pode sumir da tela. */}
      <FormErrorSummary
        errors={fieldErrors}
        mapped={['legal_name', 'name', 'rut', 'email', 'type', 'business_activity']}
        excludePrefixes={['contacts.']}
      />
```

- [ ] **Step 5: Renomear as tags `Field` → `FormField`**

Substituir todas as ocorrências (replace_all) de `<Field ` por `<FormField ` e de `</Field>` por `</FormField>`. (Não afeta `fieldErrors`, `<NestedField `, nem `</NestedField>`.)

- [ ] **Step 6: Remover as definições locais**

Apagar as funções locais `function Field(...)`, `function NestedField(...)` e `function UnmappedErrors(...)` (blocos ao final do arquivo). **Manter** `function patchContact(...)`.

- [ ] **Step 7: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 8: Verificação manual (comportamento)**

Abrir `/comercial` (ou rota de clientes), abrir um cliente em edição, adicionar contato com nome vazio e submeter → o erro `contacts.0.name` aparece **na linha do contato** (NestedField) e **não** se repete no resumo. Um erro de campo com input (ex.: email inválido) aparece sob o campo.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/commercial/components/Client/ClientDialog.tsx
git commit -m "refactor(commercial): ClientDialog usa o kit de form de shared/ui

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Migrar `BudgetDialog` e `QuoteWizard` para o kit

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`

**Interfaces:**
- Consumes: `FormField`, `FormErrorSummary`, `FormErrorBanner` (Task 1)

Ambos usam `Field` + `UnmappedErrors` (variante base, **sem** `excludePrefixes`) + banner.

- [ ] **Step 1: `git status` + Read fresco dos dois arquivos**

- [ ] **Step 2: `BudgetDialog` — imports**

Trocar:
```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown } from '@shared/ui'
```
por (remove `ReactNode`):
```tsx
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 3: `BudgetDialog` — banner + summary + tags + limpeza**

- Banner: trocar o bloco `{generalError && (<p className="mb-4 rounded bg-red-50 ...">{generalError}</p>)}` por `<FormErrorBanner message={generalError} />`.
- Summary: trocar `{fieldErrors && <UnmappedErrors errors={fieldErrors} mapped={['client_id', 'payment_terms']} />}` por `<FormErrorSummary errors={fieldErrors} mapped={['client_id', 'payment_terms']} />`.
- Renomear `<Field ` → `<FormField ` e `</Field>` → `</FormField>` (replace_all).
- Apagar as funções locais `function Field(...)` e `function UnmappedErrors(...)`.

- [ ] **Step 4: `QuoteWizard` — imports**

Trocar:
```tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText } from '@shared/ui'
```
por (remove `ReactNode`; mantém `useState`):
```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 5: `QuoteWizard` — banner + summary + tags + limpeza**

- Banner: trocar o bloco `{generalError && (<p className="mb-4 rounded bg-red-50 ...">{generalError}</p>)}` por `<FormErrorBanner message={generalError} />`.
- Summary: trocar o bloco `{fieldErrors && (<UnmappedErrors errors={fieldErrors} mapped={[...]} />)}` por `<FormErrorSummary errors={fieldErrors} mapped={['course_id', 'student_count', 'value_uf', 'purchase_order', 'planned_start_date', 'planned_end_date']} />`.
- **NÃO tocar** no bloco especial `{fieldErrors?.course_id?.[0] && (<p className="mb-4 text-sm text-red-600">...)}` (erro de curso fora do passo — comentário próprio, fora do kit).
- Renomear `<Field ` → `<FormField ` e `</Field>` → `</FormField>` (replace_all).
- Apagar as funções locais `function Field(...)` e `function UnmappedErrors(...)`.

- [ ] **Step 6: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Verificação manual**

Abrir um orçamento, criar cotação: no passo 2, deixar `student_count` inválido → erro sob o campo. Remover o curso escolhido e submeter → erro `course_id` aparece (bloco especial preservado).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/BudgetDialog.tsx frontend/src/features/commercial/components/Budget/QuoteWizard.tsx
git commit -m "refactor(commercial): BudgetDialog e QuoteWizard usam o kit de form

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Migrar `CourseDialog` para o kit

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx`

**Interfaces:**
- Consumes: `FormField`, `FormErrorSummary`, `FormErrorBanner` (Task 1)

- [ ] **Step 1: `git status` + Read fresco**

- [ ] **Step 2: Imports**

Trocar:
```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText } from '@shared/ui'
```
por:
```tsx
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 3: banner + summary + tags + limpeza**

- Banner: trocar `{generalError && (<p className="mb-4 rounded bg-red-50 ...">{generalError}</p>)}` por `<FormErrorBanner message={generalError} />`.
- Summary: trocar o bloco `{fieldErrors && (<UnmappedErrors errors={fieldErrors} mapped={['name', 'technical_name', 'description', 'workload_hours']} />)}` por `<FormErrorSummary errors={fieldErrors} mapped={['name', 'technical_name', 'description', 'workload_hours']} />`.
- Renomear `<Field ` → `<FormField ` e `</Field>` → `</FormField>` (replace_all).
- Apagar as funções locais `function Field(...)` e `function UnmappedErrors(...)`.

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Verificação manual**

Abrir `/cursos`, criar curso com `workload_hours` vazio/ inválido → erro sob o campo; nome vazio → erro sob o nome.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "refactor(catalog): CourseDialog usa o kit de form

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Migrar `RedatorDialog` e `LoginForm` para o kit

**Files:**
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx`

**Interfaces:**
- Consumes: `FormField`, `FormErrorBanner` (Task 1)

`RedatorDialog` tem `Field` + banner (sem summary). `LoginForm` migra **só o banner** (variant inline) — seus campos ficam como estão.

- [ ] **Step 1: `git status` + Read fresco dos dois arquivos**

- [ ] **Step 2: `RedatorDialog` — imports**

Trocar:
```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppTag, AppFileUpload } from '@shared/ui'
```
por (remove `ReactNode`):
```tsx
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppTag, AppFileUpload, FormField, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 3: `RedatorDialog` — banner + tags + limpeza**

- Banner: trocar `{generalError && (<p className="mb-4 rounded bg-red-50 ...">{generalError}</p>)}` por `<FormErrorBanner message={generalError} />`.
- **NÃO tocar** no bloco `{upload.error && (<p className="text-sm text-red-600">{upload.error.detail}</p>)}` (erro de upload, fora do kit).
- Renomear `<Field ` → `<FormField ` e `</Field>` → `</FormField>` (replace_all).
- Apagar a função local `function Field(...)`.

- [ ] **Step 4: `LoginForm` — imports + banner**

- Import: adicionar `FormErrorBanner` à linha `import { AppInputText, AppPassword, AppButton } from "@shared/ui";` → `import { AppInputText, AppPassword, AppButton, FormErrorBanner } from "@shared/ui";`.
- Banner: trocar o bloco:
```tsx
      {generalError && (
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {generalError}
        </div>
      )}
```
por:
```tsx
      <FormErrorBanner message={generalError} variant="inline" />
```
- **NÃO tocar** nos `<label>`/`<small>` dos campos de email/senha (fora do escopo — só o banner).

- [ ] **Step 5: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Verificação manual**

- Login com credenciais inválidas → banner inline vermelho (sem caixa) aparece, com `role="alert"`.
- Abrir `/personas`, editar um redator, nome vazio + submeter → erro sob o nome.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/identity/components/Redator/RedatorDialog.tsx frontend/src/features/identity/components/Login/LoginForm.tsx
git commit -m "refactor(identity): RedatorDialog e LoginForm usam o kit de form

role=\"alert\" agora vale para todos os banners (a11y).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 8: Registrar o desvio de comportamento**

Anexar em `.superpowers/sdd/progress.md` (criar o arquivo se não existir) uma linha: "Bloco 1: `FormErrorBanner` adiciona `role=\"alert\"` a todos os banners (antes só o LoginForm tinha) — consolidação na melhor variante, a11y de leitor de tela."

---

## Task 6: `DeleteQuoteAction` + `QuoteController` fino

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php`
- Test: `backend/tests/Feature/Comercial/QuoteCrudTest.php`

**Interfaces:**
- Produces: `DeleteQuoteAction::execute(Quote $quote): void` — lança `ValidationException` (chave `status`) se aprovada; senão soft-delete.

- [ ] **Step 1: Teste de caracterização da guarda**

Adicionar em `backend/tests/Feature/Comercial/QuoteCrudTest.php` (usa os helpers já existentes `actingAsAdmin`, `setUpBudget`):

```php
    public function test_destroy_de_cotacao_aprovada_bloqueado(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();
        $quote = Quote::create([
            'budget_id' => $this->budgetId, 'course_id' => $this->courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        $this->deleteJson("/api/quotes/{$quote->id}")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('quotes', ['id' => $quote->id, 'deleted_at' => null]);
    }
```

- [ ] **Step 2: Rodar o teste — passa (documenta a guarda inline atual)**

Run: `docker compose exec -T app php artisan test --filter=test_destroy_de_cotacao_aprovada_bloqueado`
Expected: PASS. (A guarda hoje vive inline no controller; o teste trava o comportamento antes do refactor.)

- [ ] **Step 3: Criar a Action**

Arquivo `backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Validation\ValidationException;

/**
 * Exclui (soft-delete) uma cotação. Cotação aprovada é imutável (excluir
 * desincronizaria a futura turma) → 422; recuse antes. Escrita única, sem
 * transação (mesmo padrão de UpdateQuoteAction).
 */
class DeleteQuoteAction
{
    public function execute(Quote $quote): void
    {
        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => 'Cotação aprovada não pode ser excluída. Recuse-a antes.',
            ]);
        }

        $quote->delete();
    }
}
```

- [ ] **Step 4: Deixar o controller fino**

Em `QuoteController.php`:
- Adicionar o import `use App\Domains\Commercial\Actions\DeleteQuoteAction;`.
- Substituir o método `destroy` inteiro por:
```php
    public function destroy(Quote $quote, DeleteQuoteAction $action): Response
    {
        $action->execute($quote);

        return response()->noContent();
    }
```
- Remover os imports agora órfãos: `use App\Domains\Commercial\Enums\QuoteStatus;` e `use Illuminate\Validation\ValidationException;` (só o `destroy` os usava; `Response`/`JsonResponse`/`Budget` continuam em uso).

- [ ] **Step 5: Rodar o grupo de testes comerciais de cotação**

Run: `docker compose exec -T app php artisan test --filter=QuoteCrudTest`
Expected: PASS (todos, incluindo o novo — comportamento inalterado).

- [ ] **Step 6: Pint nos arquivos tocados**

Run: `./vendor/bin/pint backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php backend/app/Domains/Commercial/Http/Controllers/QuoteController.php backend/tests/Feature/Comercial/QuoteCrudTest.php`
Expected: sem erro (confirma imports limpos).

- [ ] **Step 7: Commit**

```bash
git add backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php backend/app/Domains/Commercial/Http/Controllers/QuoteController.php backend/tests/Feature/Comercial/QuoteCrudTest.php
git commit -m "refactor(commercial): extrai DeleteQuoteAction; controller fino (ADR-02)

Adiciona teste de caracterização da guarda 'aprovada não exclui' no path de delete.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `DeleteBudgetAction` + `BudgetController` fino

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/DeleteBudgetAction.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php`
- Test: `backend/tests/Feature/Comercial/BudgetCrudTest.php`

**Interfaces:**
- Produces: `DeleteBudgetAction::execute(Budget $budget): void` — lança `ValidationException` (chave `status`) se houver cotação aprovada; senão soft-delete em transação (cascateia quotes via hook do model).

- [ ] **Step 1: Teste de caracterização da guarda**

Adicionar em `backend/tests/Feature/Comercial/BudgetCrudTest.php`. Primeiro, adicionar os imports no topo (hoje só importa `User`):
```php
use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
```
Depois o método:
```php
    public function test_destroy_com_cotacao_aprovada_bloqueado(): void
    {
        $this->actingAsAdmin();
        $budget = Budget::create(['client_id' => $this->clientId(), 'code' => 'Scap 1']);
        Quote::create([
            'budget_id' => $budget->id,
            'course_id' => Course::create(['name' => 'C', 'workload_hours' => 8])->id,
            'seq_in_budget' => 1, 'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        $this->deleteJson("/api/budgets/{$budget->id}")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('budgets', ['id' => $budget->id, 'deleted_at' => null]);
    }
```

- [ ] **Step 2: Rodar o teste — passa (guarda inline atual)**

Run: `docker compose exec -T app php artisan test --filter=test_destroy_com_cotacao_aprovada_bloqueado`
Expected: PASS.

- [ ] **Step 3: Criar a Action**

Arquivo `backend/app/Domains/Commercial/Actions/DeleteBudgetAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Exclui (soft-delete) um orçamento e cascateia para as cotações (hook do model,
 * auditado instância a instância — ADR-08) na MESMA transação. Bloqueado se
 * houver cotação aprovada → 422; recuse antes.
 */
class DeleteBudgetAction
{
    public function execute(Budget $budget): void
    {
        if ($budget->quotes()->where('status', QuoteStatus::Approved)->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Orçamento com cotação aprovada não pode ser excluído. Recuse-a antes.',
            ]);
        }

        DB::transaction(fn () => $budget->delete());
    }
}
```

- [ ] **Step 4: Deixar o controller fino**

Em `BudgetController.php`:
- Adicionar o import `use App\Domains\Commercial\Actions\DeleteBudgetAction;`.
- Substituir o método `destroy` inteiro por:
```php
    public function destroy(Budget $budget, DeleteBudgetAction $action): Response
    {
        $action->execute($budget);

        return response()->noContent();
    }
```
- Remover os imports agora órfãos: `use App\Domains\Commercial\Enums\QuoteStatus;` e `use Illuminate\Validation\ValidationException;` (só o `destroy` os usava; `Response`/`Optional` continuam em uso no `update`).

- [ ] **Step 5: Rodar o grupo de testes comerciais de orçamento**

Run: `docker compose exec -T app php artisan test --filter=BudgetCrudTest`
Expected: PASS (incluindo o novo).

- [ ] **Step 6: Rodar também o model/cascade e a suíte comercial**

Run: `docker compose exec -T app php artisan test --filter=Comercial`
Expected: PASS (BudgetModelTest `test_soft_delete_cascades_to_quotes`, QuoteApprovalTest, BudgetSummaryServiceTest — comportamento inalterado).

- [ ] **Step 7: Pint nos arquivos tocados**

Run: `./vendor/bin/pint backend/app/Domains/Commercial/Actions/DeleteBudgetAction.php backend/app/Domains/Commercial/Http/Controllers/BudgetController.php backend/tests/Feature/Comercial/BudgetCrudTest.php`
Expected: sem erro.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/Commercial/Actions/DeleteBudgetAction.php backend/app/Domains/Commercial/Http/Controllers/BudgetController.php backend/tests/Feature/Comercial/BudgetCrudTest.php
git commit -m "refactor(commercial): extrai DeleteBudgetAction; controller fino (ADR-02)

Guarda 'orçamento com cotação aprovada não exclui' vai para a Action, em transação
(cascade auditado). Teste de caracterização adicionado.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Documentar `from()` vs `fromModel()` (6.4.3)

**Files:**
- Modify: `INSTRUÇÕES-DO-PROJETO.md`

Doc-only. Cristaliza a convenção na Parte II.

- [ ] **Step 1: `git status` + Read fresco de INSTRUÇÕES-DO-PROJETO.md**

Confirmar que a seção "Padrão de entidade (CRUD)" termina na linha "Referência viva: pares ... Entidade de cadastro nova copia essa forma."

- [ ] **Step 2: Inserir a convenção**

Logo após o parágrafo "Referência viva: ... copia essa forma." (fim da subseção CRUD, antes de "### Convenções de schema e domínio"), inserir:

```markdown
**`from()` vs `fromModel()` (convenção dos DTOs — os dois sentidos do mesmo `XData`):**
- **`from()` (spatie, embutido) = ENTRADA.** Request→DTO: o controller recebe `store(XData $data)`
  e o pacote hidrata + valida por `rules()`. Campos que só existem na saída ficam `Optional`
  (ausentes na entrada) — é o que deixa UMA classe servir os dois sentidos.
- **`fromModel(X $m): self` (nosso, custom) = SAÍDA.** Model→DTO: o ÚNICO lugar que projeta o
  model — achata relações (campos do `user` no topo), coleta nested (`XData::collect(...)`) e
  deriva campos (ex.: `BudgetData` puxa `status`/totais do `BudgetSummaryService`). Controller
  SEMPRE retorna `XData::fromModel($m)`.
- **Proibido `XData::from([...])` para montar resposta** — vaza a forma do model pro controller e
  escapa da projeção única.
```

- [ ] **Step 3: Revisão de coerência**

Confirmar que o texto não contradiz o bullet existente "Data (`XData`...) = contrato único" nem "Contratos de tipo (backend → frontend)". É complementar (nomeia a convenção, não a re-decide).

- [ ] **Step 4: Commit**

```bash
git add INSTRUÇÕES-DO-PROJETO.md
git commit -m "docs: convenção from() vs fromModel() nos DTOs (6.4.3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verificação final (DoD do bloco)

Depois das 8 tasks, provar end-to-end contra a API real (`docker compose up -d`, frontend `pnpm dev`):

- [ ] **6.4.1** — `grep -rn "function Field\|function UnmappedErrors\|function NestedField" frontend/src/features` retorna vazio (zero redefinição local). `cd frontend && pnpm build && pnpm lint` verdes. Diálogos exercidos: erro de campo sob o input; erro não-mapeado no resumo; banner de erro geral (box nos diálogos, inline no login).
- [ ] **6.4.2** — Tentar excluir orçamento/cotação com cotação aprovada → **422** com mensagem; excluir sem aprovada → **204** e cascade (quote some junto do budget). `docker compose exec -T app php artisan test --filter=Comercial` verde.
- [ ] **6.4.3** — Convenção legível em INSTRUÇÕES-DO-PROJETO.md, coerente com `BudgetData` real.
- [ ] Atualizar `docs/superpowers/progress.md` movendo "Bloco 1" do backlog para a tabela como **Entregue** (feito no fechamento de sprint, não aqui).

---

## Self-Review (feito na escrita do plano)

- **Cobertura do spec:** 6.4.1 (Tasks 1-5), 6.4.2 (Tasks 6-7), 6.4.3 (Task 8) — todos os itens do spec têm task. `role="alert"` (único desvio) registrado (Task 5 Step 8).
- **Placeholders:** nenhum — todo passo traz código/rota/comando reais.
- **Consistência de tipos:** os nomes produzidos na Task 1 (`FormField`, `NestedField`, `FormErrorSummary`, `FormErrorBanner`) são exatamente os consumidos nas Tasks 2-5. `DeleteQuoteAction::execute(Quote): void` / `DeleteBudgetAction::execute(Budget): void` idem nas Tasks 6-7.
- **Escopo:** um bloco coeso, sem subsistemas independentes a decompor.
