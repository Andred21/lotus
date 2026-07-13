# Comercial Frontend (Orçamentos & Cotações) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar interface ao módulo Comercial já existente no backend — lista de orçamentos com status agregado, página de detalhe com cotações, wizard de criação de cotação, aprovação/recusa (superadmin) e anexos.

**Architecture:** `BudgetData` embute `quotes[]` e `files[]`, então `GET /budgets` é a única leitura: a lista usa `useList`, o detalhe usa `useOne`, e **toda** mutação (cotação, aprovação, anexo) invalida `budgetsApi.keys.all`, repintando tudo de uma vez. Lista e create/edit do orçamento seguem o padrão de dialog da casa; o **detalhe é página** (`/comercial/presupuestos/:id`), porque de dentro dele abrem outros dois overlays (wizard e confirmação). Uma task de backend (Task 1) fecha o contrato antes de qualquer UI.

**Tech Stack:** Laravel 13 / spatie/laravel-data (Task 1) · React 19 + TS · TanStack Query · PrimeReact via `shared/ui` · Tailwind v4 · i18next (es-CL/pt-BR/en).

Spec: `docs/superpowers/specs/2026-07-13-sprint2-commercial-frontend-design.md`

## Global Constraints

- **Backend só roda no container:** `docker compose exec -T app php artisan test`. O PHP do host não tem mbstring.
- **`./vendor/bin/pint` NUNCA sem argumento** — passar só os arquivos tocados. Sem argumento reformata o repo inteiro.
- **`generated.ts` não se edita à mão** (ADR-04): corrige-se o DTO e roda `docker compose exec -T app php artisan typescript:transform`.
- **ADR-05:** feature não importa `primereact` direto (só via `@shared/ui`) e não importa outra feature — **nem para tipo**.
- **ADR-18:** `createCrudResource` só vive em `shared/api`.
- **UF é string decimal ponta a ponta.** Proibido `Number()`, `parseFloat` ou soma em JS sobre `value_uf` / `total_*_uf`. As somas vêm do backend em bcmath (commit `1bcef7c`).
- **Nada falha em silêncio:** todo formulário usa `useMutationErrors` + o padrão `UnmappedErrors`.
- **i18n (ADR-15):** toda chave nova entra nos **3** locales (`es-CL`, `pt-BR`, `en`) com a mesma contagem. Idioma visível da UI = es-CL.
- **DoD de task de frontend:** `cd frontend && pnpm build && pnpm lint` limpos (não há test runner).
- **`git add` só os caminhos exatos da task.** O João edita o working tree ao vivo; WIP dele é intocável.
- Commits terminam com: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: Backend — totais por status + data do anexo

Fecha o contrato de dados que os três cards do detalhe e a lista de documentos consomem. Sem migration, sem rota nova.

**Files:**
- Modify: `backend/app/Domains/Commercial/Services/BudgetSummaryService.php`
- Modify: `backend/app/Domains/Commercial/Data/BudgetData.php`
- Modify: `backend/app/Shared/Files/Data/FileData.php`
- Modify: `backend/tests/Feature/Comercial/BudgetSummaryServiceTest.php`
- Modify (gerado, via artisan): `frontend/src/shared/types/generated.ts`

**Interfaces:**
- Produces: `BudgetSummaryService::totalApprovedUf(Budget): string` e `totalRejectedUf(Budget): string`; `BudgetData.total_approved_uf: string`, `BudgetData.total_rejected_uf: string`; `FileData.created_at: string|null`. Em TS: `BudgetData.total_approved_uf: undefined | string`, `total_rejected_uf: undefined | string`, `FileData.created_at: string | null`.

- [ ] **Step 1: Escrever os testes que falham**

Em `backend/tests/Feature/Comercial/BudgetSummaryServiceTest.php`, acrescentar dois testes ao final da classe (os helpers `budgetWith`/`budgetWithValues` já existem no arquivo — reusar, não recriar):

```php
    public function test_totais_por_status_somam_so_as_cotacoes_daquele_status(): void
    {
        // budgetWith cria cada cotação com 100 UF
        $budget = $this->budgetWith(['pending', 'approved', 'approved', 'rejected']);

        $this->assertSame('400.0000', $this->service->totalValueUf($budget));
        $this->assertSame('200.0000', $this->service->totalApprovedUf($budget));
        $this->assertSame('100.0000', $this->service->totalRejectedUf($budget));
    }

    public function test_totais_por_status_ignoram_cotacao_soft_deletada(): void
    {
        $budget = $this->budgetWith(['approved', 'approved', 'rejected']);
        $budget->quotes->firstWhere('status', QuoteStatus::Approved)->delete();
        $budget->refresh();

        $this->assertSame('100.0000', $this->service->totalApprovedUf($budget));
        $this->assertSame('100.0000', $this->service->totalRejectedUf($budget));
    }

    public function test_totais_por_status_sao_zero_sem_cotacao(): void
    {
        $budget = $this->budgetWith([]);

        $this->assertSame('0.0000', $this->service->totalApprovedUf($budget));
        $this->assertSame('0.0000', $this->service->totalRejectedUf($budget));
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=BudgetSummaryServiceTest`
Expected: FAIL — `Call to undefined method ...BudgetSummaryService::totalApprovedUf()`.

- [ ] **Step 3: Implementar as somas por status**

Em `BudgetSummaryService.php`, acrescentar após `totalValueUf()` (mesma soma bcmath, filtrada por status — **nunca** float):

```php
    /** Soma decimal (bcmath) das cotações aprovadas. Mesmo motivo do totalValueUf. */
    public function totalApprovedUf(Budget $budget): string
    {
        return $this->totalByStatus($budget, QuoteStatus::Approved);
    }

    /** Soma decimal (bcmath) das cotações recusadas. */
    public function totalRejectedUf(Budget $budget): string
    {
        return $this->totalByStatus($budget, QuoteStatus::Rejected);
    }

    private function totalByStatus(Budget $budget, QuoteStatus $status): string
    {
        return $budget->quotes
            ->filter(fn (Quote $q) => $q->status === $status)
            ->reduce(
                fn (string $total, Quote $q) => bcadd($total, (string) $q->value_uf, 4),
                '0.0000',
            );
    }
```

- [ ] **Step 4: Expor no `BudgetData`**

Em `BudgetData.php`, acrescentar as duas propriedades ao construtor, logo após `$total_value_uf` (mantendo o comentário existente sobre string/decimal válido para todas):

```php
        public string|Optional $total_value_uf,
        public string|Optional $total_approved_uf,
        public string|Optional $total_rejected_uf,
        public int|Optional $total_students,
```

E preenchê-las em `fromModel()`, logo após `total_value_uf`:

```php
            total_value_uf: $summary->totalValueUf($budget),
            total_approved_uf: $summary->totalApprovedUf($budget),
            total_rejected_uf: $summary->totalRejectedUf($budget),
            total_students: $summary->totalStudents($budget),
```

Não mexer em `rules()`: são derivados de saída, nunca entram no payload.

- [ ] **Step 5: `created_at` no `FileData`**

Em `FileData.php`, acrescentar a propriedade ao final do construtor e ao `fromModel()`:

```php
        public string $download_url,
        public ?string $created_at,
```

```php
            download_url: app(UploadFileAction::class)->temporaryUrl($file),
            created_at: $file->created_at?->toIso8601String(),
```

- [ ] **Step 6: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS — 113 passed (110 anteriores + 3 novos). Se algum teste de `CommercialFilesTest`/`RedatorDocumentTest` quebrar por causa do campo novo, é sinal de assert em array exato: ajustar a assert, não remover o campo.

- [ ] **Step 7: Regenerar os tipos TS**

Run: `docker compose exec -T app php artisan typescript:transform`
Depois: `git diff --stat frontend/src/shared/types/generated.ts`
Expected: `generated.ts` ganha `total_approved_uf`, `total_rejected_uf` em `BudgetData` e `created_at` em `FileData`. **Nunca editar o arquivo à mão.**

- [ ] **Step 8: Pint só nos arquivos tocados + commit**

```bash
./vendor/bin/pint backend/app/Domains/Commercial/Services/BudgetSummaryService.php backend/app/Domains/Commercial/Data/BudgetData.php backend/app/Shared/Files/Data/FileData.php backend/tests/Feature/Comercial/BudgetSummaryServiceTest.php
git add backend/app/Domains/Commercial/Services/BudgetSummaryService.php backend/app/Domains/Commercial/Data/BudgetData.php backend/app/Shared/Files/Data/FileData.php backend/tests/Feature/Comercial/BudgetSummaryServiceTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(comercial): totais por status no BudgetSummaryService + created_at no FileData"
```

---

### Task 2: Camada de dados do frontend (Notion 6.2.1)

**Files:**
- Create: `frontend/src/shared/api/budgetsApi.ts`
- Create: `frontend/src/features/commercial/api/useQuotes.ts`
- Create: `frontend/src/features/commercial/api/useCommercialFiles.ts`
- Create: `frontend/src/features/commercial/lib/quoteStatus.ts`
- Create: `frontend/src/features/commercial/lib/uf.ts`

**Interfaces:**
- Consumes: tipos `BudgetData`, `QuoteData`, `QuoteStatus`, `FileData` de `@shared/types/generated` (Task 1).
- Produces:
  - `budgetsApi` = `createCrudResource<BudgetData>('budgets')` → `useList()`, `useOne(id)`, `useCreate()`, `useUpdate()`, `useRemove()`, `keys`.
  - `useCreateQuote()` (vars `{ budgetId: number; payload: QuotePayload }`), `useUpdateQuote()` (vars `{ quoteId: number; payload: QuotePayload }`), `useRemoveQuote()` (vars `quoteId: number`), `useApproveQuote()` / `useRejectQuote()` (vars `quoteId: number`).
  - `type QuotePayload = { course_id: number; student_count: number; value_uf: string; purchase_order: string | null; planned_start_date: string | null; planned_end_date: string | null }`
  - `useUploadBudgetFile()` (vars `{ budgetId: number; type: 'invoice' | 'receipt'; file: File }`), `useRemoveBudgetFile()` (vars `{ budgetId: number; fileId: number }`), `useUploadQuoteFile()` (vars `{ quoteId: number; file: File }`), `useRemoveQuoteFile()` (vars `{ quoteId: number; fileId: number }`).
  - `quoteStatusSeverity(status: QuoteStatus): 'warning' | 'success' | 'danger'`
  - `formatUf(value: string): string`

- [ ] **Step 1: `shared/api/budgetsApi.ts`**

Espelha `coursesApi.ts` (ADR-18 — a fábrica só vive em `shared/api`):

```ts
import { createCrudResource } from './createCrudResource'
import type { BudgetData } from '@shared/types/generated'

/** Cliente REST do recurso `budgets`. Como `BudgetData` já embute `quotes[]` e
 * `files[]` (o backend eager-loada os dois), esta é a ÚNICA leitura do módulo:
 * lista e detalhe descem daqui, e toda mutação de cotação/anexo invalida
 * `keys.all` para repintar totais e status agregado de uma vez. */
export const budgetsApi = createCrudResource<BudgetData>('budgets')
```

- [ ] **Step 2: `features/commercial/api/useQuotes.ts`**

Só mutações — não existe leitura de cotação (ela vem dentro do `BudgetData`). Espelha `useRedatorDocuments.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { QuoteData } from '@shared/types/generated'
import { budgetsApi } from '@shared/api/budgetsApi'

/** Campos que a UI escreve numa cotação. `client_id` NÃO entra: vem do orçamento
 * pai (o backend nem aceita). `value_uf` é string decimal — dinheiro não passa
 * por float. `status`/`seq_in_budget`/`code` são read-only do servidor. */
export type QuotePayload = {
  course_id: number
  student_count: number
  value_uf: string
  purchase_order: string | null
  planned_start_date: string | null
  planned_end_date: string | null
}

/** Toda mutação de cotação repinta o orçamento inteiro: status agregado e totais
 * são derivados das cotações no backend. */
function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: budgetsApi.keys.all })
}

export function useCreateQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, { budgetId: number; payload: QuotePayload }>({
    mutationFn: ({ budgetId, payload }) =>
      api.post<QuoteData>(`/api/budgets/${budgetId}/quotes`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, { quoteId: number; payload: QuotePayload }>({
    mutationFn: ({ quoteId, payload }) =>
      api.put<QuoteData>(`/api/quotes/${quoteId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveQuote() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (quoteId) => api.delete(`/api/quotes/${quoteId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useApproveQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, number>({
    mutationFn: (quoteId) => api.post<QuoteData>(`/api/quotes/${quoteId}/approve`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRejectQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, number>({
    mutationFn: (quoteId) => api.post<QuoteData>(`/api/quotes/${quoteId}/reject`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 3: `features/commercial/api/useCommercialFiles.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { FileData } from '@shared/types/generated'
import { budgetsApi } from '@shared/api/budgetsApi'

/** Tipos aceitos pelo backend: orçamento = fatura/comprovante; cotação = documento. */
export type BudgetFileType = 'invoice' | 'receipt'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: budgetsApi.keys.all })
}

/** O FormData NÃO leva Content-Type explícito: o axios deriva multipart+boundary
 * do payload. Fixar `application/json` fazia o transformRequest serializar o
 * FormData e o arquivo chegava VAZIO, com 201 silencioso (bug 3 da Sprint 1). */
export function useUploadBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { budgetId: number; type: BudgetFileType; file: File }>({
    mutationFn: ({ budgetId, type, file }) => {
      const fd = new FormData()
      fd.append('type', type)
      fd.append('file', file)
      return api.post<FileData>(`/api/budgets/${budgetId}/files`, fd).then((r) => r.data)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, { budgetId: number; fileId: number }>({
    mutationFn: ({ budgetId, fileId }) =>
      api.delete(`/api/budgets/${budgetId}/files/${fileId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useUploadQuoteFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { quoteId: number; file: File }>({
    mutationFn: ({ quoteId, file }) => {
      const fd = new FormData()
      fd.append('type', 'quote_document')
      fd.append('file', file)
      return api.post<FileData>(`/api/quotes/${quoteId}/files`, fd).then((r) => r.data)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveQuoteFile() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, { quoteId: number; fileId: number }>({
    mutationFn: ({ quoteId, fileId }) =>
      api.delete(`/api/quotes/${quoteId}/files/${fileId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 4: `features/commercial/lib/quoteStatus.ts`**

Espelha `features/identity/lib/redatorStatus.ts` (lib de feature, não de shared):

```ts
import type { QuoteStatus } from '@shared/types/generated'

/** Severidade da AppTag por status de cotação. A chave i18n é `quoteStatus.<status>`. */
export function quoteStatusSeverity(status: QuoteStatus): 'warning' | 'success' | 'danger' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}
```

- [ ] **Step 5: `features/commercial/lib/uf.ts`**

```ts
/** Formata um valor em UF para exibição, SEM passar por float: o backend manda
 * decimal(12,4) como string ("450.0000") e converter para Number reintroduziria
 * o erro de representação que o decimal existe para evitar. Só corta zeros à
 * direita e troca o ponto pela vírgula (es-CL). */
export function formatUf(value: string): string {
  const [int, frac = ''] = value.split('.')
  const trimmed = frac.replace(/0+$/, '')
  return trimmed ? `${int},${trimmed}` : int
}
```

- [ ] **Step 6: Build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: ambos limpos. (Nenhuma tela consome isto ainda — o objetivo é o contrato compilar.)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/api/budgetsApi.ts frontend/src/features/commercial/api/useQuotes.ts frontend/src/features/commercial/api/useCommercialFiles.ts frontend/src/features/commercial/lib/quoteStatus.ts frontend/src/features/commercial/lib/uf.ts
git commit -m "feat(comercial): camada de dados de orçamentos, cotações e anexos"
```

---

### Task 3: i18n — chaves `budget.*` e `quoteStatus.*` nos 3 locales

Feita antes das telas: sem as chaves, a UI renderiza a chave crua (foi o que aconteceu com `common.close` na B8).

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces: namespaces `budget` e `quoteStatus` (as chaves abaixo, idênticas nos 3 arquivos).

- [ ] **Step 1: Acrescentar os blocos em `es-CL.json`**

Idioma visível da UI. Manter a ordem/estilo do arquivo (blocos irmãos de `client`/`course`):

```json
  "budget": {
    "module": "Comercial",
    "moduleDescription": "Gestión de clientes y presupuestos de capacitación",
    "tab": "Presupuestos",
    "new": "Nuevo presupuesto",
    "create": "Crear presupuesto",
    "searchPlaceholder": "Buscar por código o cliente...",
    "filterAll": "Todos",
    "code": "Código",
    "client": "Cliente",
    "quoteCount": "Cotizaciones",
    "totalValue": "Valor total",
    "status": "Estado",
    "paymentTerms": "Forma de pago",
    "empty": "No hay presupuestos",
    "count": "{{count}} presupuestos",
    "back": "Volver a Comercial",
    "totalQuoted": "Total cotizado",
    "totalApproved": "Total aprobado",
    "totalRejected": "Total rechazado",
    "totalStudents": "Total de alumnos",
    "notFound": "Presupuesto no encontrado",
    "quotes": "Cotizaciones",
    "addQuote": "Agregar cotización",
    "noQuotes": "Este presupuesto aún no tiene cotizaciones",
    "documents": "Documentos",
    "uploadDocument": "Subir documento",
    "noDocuments": "Sin documentos",
    "fileTypeInvoice": "Factura",
    "fileTypeReceipt": "Comprobante"
  },
  "quote": {
    "new": "Nueva cotización",
    "edit": "Editar cotización",
    "create": "Crear cotización",
    "stepCourse": "Curso",
    "stepData": "Datos de la cotización",
    "course": "Curso",
    "courseSearchPlaceholder": "Buscar curso...",
    "students": "Alumnos",
    "valueUf": "Valor UF",
    "purchaseOrder": "Orden de compra",
    "plannedStart": "Inicio planificado",
    "plannedEnd": "Fin planificado",
    "next": "Siguiente",
    "back": "Volver",
    "approve": "Aprobar",
    "reject": "Rechazar",
    "rejectedNote": "Cotización rechazada — no se generará turma.",
    "confirmApproveTitle": "¿Aprobar cotización?",
    "confirmApproveBody": "Aprobar libera la generación de turma en Operación. Puedes revertirlo rechazando la cotización.",
    "confirmRejectTitle": "¿Rechazar cotización?",
    "confirmRejectBody": "Rechazar deshace la aprobación y libera la edición de la cotización.",
    "documents": "Documentos",
    "studentsShort": "{{count}} alumnos"
  },
  "quoteStatus": {
    "pending": "Pendiente",
    "approved": "Aprobada",
    "rejected": "Rechazada"
  },
```

- [ ] **Step 2: Mesmos blocos em `pt-BR.json`**

```json
  "budget": {
    "module": "Comercial",
    "moduleDescription": "Gestão de clientes e orçamentos de capacitação",
    "tab": "Orçamentos",
    "new": "Novo orçamento",
    "create": "Criar orçamento",
    "searchPlaceholder": "Buscar por código ou cliente...",
    "filterAll": "Todos",
    "code": "Código",
    "client": "Cliente",
    "quoteCount": "Cotações",
    "totalValue": "Valor total",
    "status": "Estado",
    "paymentTerms": "Forma de pagamento",
    "empty": "Nenhum orçamento",
    "count": "{{count}} orçamentos",
    "back": "Voltar ao Comercial",
    "totalQuoted": "Total cotado",
    "totalApproved": "Total aprovado",
    "totalRejected": "Total recusado",
    "totalStudents": "Total de alunos",
    "notFound": "Orçamento não encontrado",
    "quotes": "Cotações",
    "addQuote": "Adicionar cotação",
    "noQuotes": "Este orçamento ainda não tem cotações",
    "documents": "Documentos",
    "uploadDocument": "Enviar documento",
    "noDocuments": "Sem documentos",
    "fileTypeInvoice": "Fatura",
    "fileTypeReceipt": "Comprovante"
  },
  "quote": {
    "new": "Nova cotação",
    "edit": "Editar cotação",
    "create": "Criar cotação",
    "stepCourse": "Curso",
    "stepData": "Dados da cotação",
    "course": "Curso",
    "courseSearchPlaceholder": "Buscar curso...",
    "students": "Alunos",
    "valueUf": "Valor UF",
    "purchaseOrder": "Ordem de compra",
    "plannedStart": "Início planejado",
    "plannedEnd": "Fim planejado",
    "next": "Seguinte",
    "back": "Voltar",
    "approve": "Aprovar",
    "reject": "Recusar",
    "rejectedNote": "Cotação recusada — não gerará turma.",
    "confirmApproveTitle": "Aprovar cotação?",
    "confirmApproveBody": "Aprovar libera a geração de turma na Operação. Pode ser revertido recusando a cotação.",
    "confirmRejectTitle": "Recusar cotação?",
    "confirmRejectBody": "Recusar desfaz a aprovação e libera a edição da cotação.",
    "documents": "Documentos",
    "studentsShort": "{{count}} alunos"
  },
  "quoteStatus": {
    "pending": "Pendente",
    "approved": "Aprovada",
    "rejected": "Recusada"
  },
```

- [ ] **Step 3: Mesmos blocos em `en.json`**

```json
  "budget": {
    "module": "Commercial",
    "moduleDescription": "Manage clients and training budgets",
    "tab": "Budgets",
    "new": "New budget",
    "create": "Create budget",
    "searchPlaceholder": "Search by code or client...",
    "filterAll": "All",
    "code": "Code",
    "client": "Client",
    "quoteCount": "Quotes",
    "totalValue": "Total value",
    "status": "Status",
    "paymentTerms": "Payment terms",
    "empty": "No budgets",
    "count": "{{count}} budgets",
    "back": "Back to Commercial",
    "totalQuoted": "Total quoted",
    "totalApproved": "Total approved",
    "totalRejected": "Total rejected",
    "totalStudents": "Total students",
    "notFound": "Budget not found",
    "quotes": "Quotes",
    "addQuote": "Add quote",
    "noQuotes": "This budget has no quotes yet",
    "documents": "Documents",
    "uploadDocument": "Upload document",
    "noDocuments": "No documents",
    "fileTypeInvoice": "Invoice",
    "fileTypeReceipt": "Receipt"
  },
  "quote": {
    "new": "New quote",
    "edit": "Edit quote",
    "create": "Create quote",
    "stepCourse": "Course",
    "stepData": "Quote data",
    "course": "Course",
    "courseSearchPlaceholder": "Search course...",
    "students": "Students",
    "valueUf": "Value UF",
    "purchaseOrder": "Purchase order",
    "plannedStart": "Planned start",
    "plannedEnd": "Planned end",
    "next": "Next",
    "back": "Back",
    "approve": "Approve",
    "reject": "Reject",
    "rejectedNote": "Quote rejected — no class will be created.",
    "confirmApproveTitle": "Approve quote?",
    "confirmApproveBody": "Approving unlocks class creation in Operations. You can revert it by rejecting the quote.",
    "confirmRejectTitle": "Reject quote?",
    "confirmRejectBody": "Rejecting undoes the approval and unlocks editing.",
    "documents": "Documents",
    "studentsShort": "{{count}} students"
  },
  "quoteStatus": {
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected"
  },
```

- [ ] **Step 4: Provar que as 3 chaves batem em contagem (ADR-15)**

```bash
cd frontend && for f in src/shared/config/locales/*.json; do echo -n "$f "; python3 -c "
import json,sys
d=json.load(open('$f'))
print(sum(len(v) if isinstance(v,dict) else 1 for v in d.values()), 'chaves /', len(d), 'namespaces')
"; done
```
Expected: os 3 arquivos com **o mesmo** número de chaves e de namespaces.

- [ ] **Step 5: Build + lint + commit**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/en.json
git commit -m "feat(i18n): chaves de orçamento e cotação nos 3 locales"
```

---

### Task 4: Lista de orçamentos na aba do Comercial (Notion 6.2.2 — parte 1)

**Files:**
- Create: `frontend/src/features/commercial/hooks/useBudgetsPage.ts`
- Create: `frontend/src/features/commercial/hooks/useBudgetForm.ts`
- Create: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Create: `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`

**Interfaces:**
- Consumes: `budgetsApi` (Task 2), `quoteStatusSeverity` + `formatUf` (Task 2), chaves `budget.*`/`quoteStatus.*` (Task 3), `clientsApi` (já em `@shared/api/clientsApi`), `useCrudPage`/`useEntityForm`/`useMutationErrors` (`@shared/hooks`), `CrudDialog`/`AppDataTable`/`AppColumn`/`AppInputText`/`AppDropdown`/`AppTag`/`AppButton` (`@shared/ui`).
- Produces: `useBudgetsPage()` → o mesmo shape de `useCrudPage`; `BudgetsTable`; `BudgetDialog`; a aba "Presupuestos" da `CommercialPage`.

- [ ] **Step 1: `useBudgetsPage.ts`**

Uma linha, como `useCoursesPage`:

```ts
import { useCrudPage } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'

export function useBudgetsPage() {
  return useCrudPage(budgetsApi)
}
```

- [ ] **Step 2: `useBudgetForm.ts`**

Espelha `useCourseForm` (sem o sync). Só `client_id` e `payment_terms` são escritos — `code` e o cliente são imutáveis em edição no backend:

```ts
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { BudgetData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { budgetsApi } from '@shared/api/budgetsApi'

export type BudgetDialogMode = DialogMode

/** Só os campos que o formulário edita. Totais, status, código e cotações são
 * derivados do servidor e nunca voltam no payload. */
export type BudgetFormFields = Pick<BudgetData, 'id' | 'client_id' | 'payment_terms'>

const EMPTY: BudgetFormFields = { id: undefined, client_id: 0, payment_terms: null }

const toFields = (b: BudgetFormFields): BudgetFormFields =>
  structuredClone({ id: b.id, client_id: b.client_id, payment_terms: b.payment_terms })

export function useBudgetForm(budget: BudgetData | null, mode: BudgetDialogMode, onDone: () => void) {
  const { form, set, readOnly } = useEntityForm<BudgetFormFields>(budget, mode, EMPTY, toFields)
  const create = budgetsApi.useCreate()
  const update = budgetsApi.useUpdate()

  function submit() {
    if (mode === 'create') {
      create.mutate(
        { client_id: form.client_id, payment_terms: form.payment_terms },
        { onSuccess: onDone },
      )
      return
    }
    // Em edit o backend só aceita payment_terms; client_id vai junto porque o DTO
    // o exige na validação, mas o controller o ignora (é imutável por construção).
    update.mutate(
      { id: budget!.id!, payload: { client_id: form.client_id, payment_terms: form.payment_terms } },
      { onSuccess: onDone },
    )
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return { form, set, readOnly, submit, pending: create.isPending || update.isPending, fieldErrors, generalError }
}
```

- [ ] **Step 3: `BudgetsTable.tsx`**

Colunas do protótipo. O nome do cliente vem de `clientsApi` (que já mora em `shared/api` — nada de import cross-feature). Navegação para o detalhe pelo botão de olho:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag } from '@shared/ui'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { clientsApi } from '@shared/api/clientsApi'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'

const STATUSES: QuoteStatus[] = ['pending', 'approved', 'rejected']

export function BudgetsTable({ budgets, loading }: { budgets: BudgetData[]; loading: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<QuoteStatus | null>(null)
  const clients = clientsApi.useList()

  const clientName = (id: number) => clients.data?.find((c) => c.id === id)?.legal_name ?? '—'

  // Busca por código OU cliente: o AppDataTable filtra só por campos da própria
  // linha, e o nome do cliente não é um deles (vem de outra query). Por isso o
  // filtro é aplicado aqui, antes de entregar as linhas à tabela.
  const rows = budgets.filter((b) => {
    const matchesStatus = status === null || b.status === status
    const term = filter.trim().toLowerCase()
    const matchesTerm =
      term === '' ||
      (b.code ?? '').toLowerCase().includes(term) ||
      clientName(b.client_id).toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })

  const statusOptions = [
    { label: t('budget.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`quoteStatus.${s}`), value: s })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <AppInputText
            leftIcon="pi pi-search"
            placeholder={t('budget.searchPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="w-48">
          <AppDropdown
            value={status}
            options={statusOptions}
            onChange={(e) => setStatus(e.value as QuoteStatus | null)}
          />
        </div>
      </div>

      <AppDataTable value={rows} loading={loading} emptyMessage={t('budget.empty')}>
        <AppColumn header={t('budget.code')} body={(b: BudgetData) => <span className="font-mono text-sm text-sky-600">{b.code}</span>} />
        <AppColumn header={t('budget.client')} body={(b: BudgetData) => clientName(b.client_id)} />
        <AppColumn header={t('budget.quoteCount')} body={(b: BudgetData) => b.quotes.length} />
        <AppColumn header={t('budget.totalValue')} body={(b: BudgetData) => `${formatUf(b.total_value_uf ?? '0')} UF`} />
        <AppColumn
          header={t('budget.status')}
          body={(b: BudgetData) =>
            b.status ? <AppTag value={t(`quoteStatus.${b.status}`)} severity={quoteStatusSeverity(b.status)} /> : null
          }
        />
        <AppColumn
          body={(b: BudgetData) => (
            <AppButton icon="pi pi-eye" text rounded onClick={() => navigate(`/comercial/presupuestos/${b.id}`)} />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>

      <p className="text-sm text-slate-500">{t('budget.count', { count: rows.length })}</p>
    </div>
  )
}
```

- [ ] **Step 4: `BudgetDialog.tsx`**

Create/edit apenas (o detalhe é página). Espelha o `CourseDialog`, inclusive `Field` e `UnmappedErrors`:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'
import { clientsApi } from '@shared/api/clientsApi'
import { useBudgetForm, type BudgetDialogMode } from '../../hooks/useBudgetForm'

export function BudgetDialog({
  visible, mode, budget, onHide,
}: {
  visible: boolean
  mode: BudgetDialogMode
  budget: BudgetData | null
  onHide: () => void
}) {
  const { t } = useTranslation()
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } = useBudgetForm(budget, mode, onHide)
  const clients = clientsApi.useList()

  const isCreate = mode === 'create'
  const clientOptions = (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id }))

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={isCreate ? t('budget.new') : (budget?.code ?? '')}
      onHide={onHide}
      onSubmit={submit}
      pending={pending}
      submitLabel={isCreate ? t('budget.create') : undefined}
    >
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}
      {fieldErrors && <UnmappedErrors errors={fieldErrors} mapped={['client_id', 'payment_terms']} />}

      <section className="space-y-4">
        <Field label={t('budget.client')} error={fieldErrors?.client_id?.[0]}>
          {/* Cliente é imutável depois de criado: o backend só deixa payment_terms mudar. */}
          <AppDropdown
            value={form.client_id}
            options={clientOptions}
            disabled={readOnly || !isCreate}
            onChange={(e) => set('client_id', e.value as number)}
          />
        </Field>

        <Field label={t('budget.paymentTerms')} error={fieldErrors?.payment_terms?.[0]}>
          <AppInputText
            value={form.payment_terms ?? ''}
            disabled={readOnly}
            onChange={(e) => set('payment_terms', e.target.value)}
            className="w-full"
          />
        </Field>
      </section>
    </CrudDialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

/** Um 422 cujo campo não tem input nesta tela ficaria invisível e o botão de
 * salvar pareceria inerte. Lista o que sobrou, para nunca falhar em silêncio. */
function UnmappedErrors({ errors, mapped }: { errors: Record<string, string[]>; mapped: string[] }) {
  const leftover = Object.entries(errors).filter(([key]) => !mapped.includes(key))
  if (leftover.length === 0) return null
  return (
    <ul className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {leftover.map(([key, msgs]) => (
        <li key={key}>{msgs[0]}</li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: Plugar a aba na `CommercialPage`**

Substituir o placeholder da aba de orçamentos e tornar o botão do header dependente da aba ativa. Arquivo inteiro:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { useBudgetsPage } from '../hooks/useBudgetsPage'
import { ClientsTable } from './Client/ClientsTable'
import { ClientDialog } from './Client/ClientDialog'
import { BudgetsTable } from './Budget/BudgetsTable'
import { BudgetDialog } from './Budget/BudgetDialog'

export function CommercialPage() {
  const { t } = useTranslation()
  const clients = useClientsPage()
  const budgets = useBudgetsPage()
  const [tab, setTab] = useState(0)

  const onBudgets = tab === 1

  return (
    <ModulePage
      title={t('client.module')}
      description={t('client.moduleDescription')}
      actions={
        onBudgets ? (
          <AppButton variant="brandIcon" label={t('budget.new')} icon="pi pi-file" onClick={budgets.openCreate} />
        ) : (
          <AppButton variant="brandIcon" label={t('client.new')} icon="pi pi-user-plus" onClick={clients.openCreate} />
        )
      }
    >
      <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
        <ModuleTab header={t('client.tabClients')}>
          <ClientsTable clients={clients.items} loading={clients.loading} onView={clients.openView} />
        </ModuleTab>
        <ModuleTab header={t('budget.tab')}>
          <BudgetsTable budgets={budgets.items} loading={budgets.loading} />
        </ModuleTab>
      </ModuleTabs>

      {clients.dialog && (
        <ClientDialog
          visible
          mode={clients.dialog.mode}
          client={clients.dialog.entity}
          onHide={clients.close}
          onEdit={clients.startEdit}
        />
      )}

      {budgets.dialog && (
        <BudgetDialog visible mode={budgets.dialog.mode} budget={budgets.dialog.entity} onHide={budgets.close} />
      )}
    </ModulePage>
  )
}
```

Nota: a chave `client.tabBudgets` e `client.budgetsPlaceholder` ficam órfãs. **Não remover nesta task** (mexeria nos 3 locales fora do escopo) — anotar para a limpeza da Task 9.

- [ ] **Step 6: Build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: limpos. O botão de olho aponta para `/comercial/presupuestos/:id`, rota que só nasce na Task 5 — clicar hoje cai no `*` do router e volta para `/`. Esperado.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial/hooks/useBudgetsPage.ts frontend/src/features/commercial/hooks/useBudgetForm.ts frontend/src/features/commercial/components/Budget/BudgetsTable.tsx frontend/src/features/commercial/components/Budget/BudgetDialog.tsx frontend/src/features/commercial/components/CommercialPage.tsx
git commit -m "feat(comercial): aba de orçamentos com lista, filtro e dialog de cadastro"
```

---

### Task 5: Página de detalhe do orçamento (Notion 6.2.2 — parte 2)

**Files:**
- Create: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Create: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx`

**Interfaces:**
- Consumes: `budgetsApi.useOne(id)` (Task 2), `formatUf`/`quoteStatusSeverity` (Task 2), chaves `budget.*`/`quote.*`/`quoteStatus.*` (Task 3), `coursesApi` (`@shared/api/coursesApi`), `clientsApi`, `BudgetDialog` (Task 4).
- Produces: rota `/comercial/presupuestos/:id`; `BudgetDetailPage`; `QuotesList` com a prop `quotes: QuoteData[]` (as ações por linha entram nas Tasks 6 e 7 — nesta task é leitura).

> **Correção do plano (achado do review da Task 4):** o `BudgetDialog` da Task 4 tem modo `edit`, mas nenhuma tela o abria — `payment_terms` ficaria ineditável, contra o spec. O botão "Editar" do detalhe (Step 2 abaixo) fecha esse buraco. É o mesmo lugar onde o protótipo põe a edição.

- [ ] **Step 1: `QuotesList.tsx` (só leitura, por enquanto)**

```tsx
import { useTranslation } from 'react-i18next'
import { AppTag } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'

export function QuotesList({ quotes }: { quotes: QuoteData[] }) {
  const { t } = useTranslation()
  const courses = coursesApi.useList()

  const courseName = (id: number) => courses.data?.find((c) => c.id === id)?.name ?? '—'

  if (quotes.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{t('budget.noQuotes')}</p>
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {quotes.map((q) => (
        <div key={q.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <div className="min-w-64 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{courseName(q.course_id)}</span>
              {q.status && <AppTag value={t(`quoteStatus.${q.status}`)} severity={quoteStatusSeverity(q.status)} />}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t('quote.studentsShort', { count: q.student_count })}
              {q.planned_start_date && ` · ${q.planned_start_date}`}
              {q.planned_end_date && ` – ${q.planned_end_date}`}
            </p>
            {q.status === 'rejected' && <p className="mt-1 text-sm text-red-600">{t('quote.rejectedNote')}</p>}
          </div>

          <span className="font-semibold">{formatUf(q.value_uf)} UF</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: `BudgetDetailPage.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { AppButton, AppTag } from '@shared/ui'
import { budgetsApi } from '@shared/api/budgetsApi'
import { clientsApi } from '@shared/api/clientsApi'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { QuotesList } from './QuotesList'
import { BudgetDialog } from './BudgetDialog'

export function BudgetDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const budgetId = Number(id)

  const query = budgetsApi.useOne(budgetId)
  const clients = clientsApi.useList()
  const budget = query.data

  // Declarado ANTES dos early returns: hook não pode ficar atrás de return condicional.
  const [editing, setEditing] = useState(false)

  if (query.isLoading) return <p className="p-4 text-sm text-slate-500">{t('common.notLoaded')}</p>
  if (!budget) return <p className="p-4 text-sm text-slate-500">{t('budget.notFound')}</p>

  const client = clients.data?.find((c) => c.id === budget.client_id)

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={() => navigate('/comercial')}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('budget.back')}
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{budget.code}</h2>
          <p className="text-sm text-slate-500">
            {client?.legal_name ?? '—'}
            {client?.rut && ` · RUT ${client.rut}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {budget.status && (
            <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
          )}
          {/* Único caminho de edição do orçamento: o backend só deixa payment_terms
              mudar (cliente e código são imutáveis). */}
          <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={() => setEditing(true)} />
        </div>
      </header>

      {/* Os três totais vêm SOMADOS do backend (bcmath). A UI nunca soma UF. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label={t('budget.totalQuoted')} value={budget.total_value_uf} />
        <TotalCard label={t('budget.totalApproved')} value={budget.total_approved_uf} tone="success" />
        <TotalCard label={t('budget.totalRejected')} value={budget.total_rejected_uf} tone="danger" />
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700">
        <header className="flex items-center justify-between p-4">
          <h3 className="font-medium">
            {t('budget.quotes')} <span className="text-slate-500">({budget.quotes.length})</span>
          </h3>
        </header>
        <QuotesList quotes={budget.quotes} />
      </section>

      {/* Reusa o dialog da Task 4 em modo edit — em `edit` ele trava cliente e
          código e só deixa a forma de pagamento mudar. */}
      {editing && (
        <BudgetDialog visible mode="edit" budget={budget} onHide={() => setEditing(false)} />
      )}
    </div>
  )
}

function TotalCard({ label, value, tone }: { label: string; value?: string; tone?: 'success' | 'danger' }) {
  const color =
    tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className={`text-2xl font-semibold ${color}`}>{formatUf(value ?? '0')} UF</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}
```

Nota para quem implementa: o `BudgetDialog` (Task 4) já existe e recebe `{ visible, mode, budget, onHide }` — não o reescreva, só o consuma. `common.edit` já existe nos 3 locales.

- [ ] **Step 3: Rota no `AppRouter.tsx`**

Acrescentar o import e a rota dentro do bloco protegido, logo abaixo de `/comercial`:

```tsx
import { BudgetDetailPage } from '@features/commercial/components/Budget/BudgetDetailPage'
```

```tsx
          <Route path="/comercial" element={<CommercialPage />} />
          <Route path="/comercial/presupuestos/:id" element={<BudgetDetailPage />} />
```

- [ ] **Step 4: Build + lint + commit**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx frontend/src/features/commercial/components/Budget/QuotesList.tsx frontend/src/app/router/AppRouter.tsx
git commit -m "feat(comercial): página de detalhe do orçamento com totais e cotações"
```

---

### Task 6: Wizard de cotação — criar e editar (Notion 6.2.3)

**Files:**
- Create: `frontend/src/features/commercial/hooks/useQuoteForm.ts`
- Create: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`

**Interfaces:**
- Consumes: `useCreateQuote`/`useUpdateQuote`/`useRemoveQuote` + `QuotePayload` (Task 2), `useEntityForm`/`useMutationErrors` (`@shared/hooks`), `AppDialog`/`AppButton`/`AppInputText` (`@shared/ui`), `coursesApi`.
- Produces: `useQuoteForm(budgetId, quote, onDone)` → `{ form, set, step, next, back, canAdvance, submit, pending, fieldErrors, generalError }`; `QuoteWizard` com props `{ visible, budgetId, quote, onHide }`; `QuotesList` ganha as props opcionais `onEdit?: (q: QuoteData) => void` e `onRemove?: (q: QuoteData) => void`.

- [ ] **Step 1: `useQuoteForm.ts`**

```ts
import { useState } from 'react'
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { QuoteData } from '@shared/types/generated'
import { useCreateQuote, useUpdateQuote, type QuotePayload } from '../api/useQuotes'

/** Campos que o wizard edita. `value_uf` fica STRING o caminho todo: converter
 * para Number reintroduziria o float que o decimal do backend existe para evitar. */
export type QuoteFormFields = Pick<
  QuoteData,
  'id' | 'course_id' | 'student_count' | 'value_uf' | 'purchase_order' | 'planned_start_date' | 'planned_end_date'
>

const EMPTY: QuoteFormFields = {
  id: undefined,
  course_id: 0,
  student_count: 1,
  value_uf: '',
  purchase_order: null,
  planned_start_date: null,
  planned_end_date: null,
}

const toFields = (q: QuoteFormFields): QuoteFormFields =>
  structuredClone({
    id: q.id,
    course_id: q.course_id,
    student_count: q.student_count,
    value_uf: q.value_uf,
    purchase_order: q.purchase_order,
    planned_start_date: q.planned_start_date,
    planned_end_date: q.planned_end_date,
  })

export function useQuoteForm(budgetId: number, quote: QuoteData | null, onDone: () => void) {
  const mode = quote ? 'edit' : 'create'
  const { form, set, didReset } = useEntityForm<QuoteFormFields>(quote, mode, EMPTY, toFields)
  const create = useCreateQuote()
  const update = useUpdateQuote()

  // Editar já tem curso escolhido: abre direto no passo 2 (dá para voltar e trocar).
  const [step, setStep] = useState<1 | 2>(quote ? 2 : 1)
  if (didReset) setStep(quote ? 2 : 1)

  const payload = (): QuotePayload => ({
    course_id: form.course_id,
    student_count: form.student_count,
    value_uf: form.value_uf,
    purchase_order: form.purchase_order,
    planned_start_date: form.planned_start_date,
    planned_end_date: form.planned_end_date,
  })

  function submit() {
    if (quote) {
      update.mutate({ quoteId: quote.id!, payload: payload() }, { onSuccess: onDone })
      return
    }
    create.mutate({ budgetId, payload: payload() }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form,
    set,
    step,
    next: () => setStep(2),
    back: () => setStep(1),
    canAdvance: form.course_id > 0,
    submit,
    pending: create.isPending || update.isPending,
    fieldErrors,
    generalError,
  }
}
```

- [ ] **Step 2: `QuoteWizard.tsx`**

Dois passos: curso → dados. `client_id` não aparece (vem do orçamento pai).

```tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { useQuoteForm } from '../../hooks/useQuoteForm'

export function QuoteWizard({
  visible, budgetId, quote, onHide,
}: {
  visible: boolean
  budgetId: number
  quote: QuoteData | null
  onHide: () => void
}) {
  const { t } = useTranslation()
  const { form, set, step, next, back, canAdvance, submit, pending, fieldErrors, generalError } =
    useQuoteForm(budgetId, quote, onHide)
  const courses = coursesApi.useList()
  const [search, setSearch] = useState('')

  const list = (courses.data ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const footer =
    step === 1 ? (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton variant="brandIcon" label={t('quote.next')} icon="pi pi-arrow-right" disabled={!canAdvance} onClick={next} />
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <AppButton label={t('quote.back')} text icon="pi pi-arrow-left" onClick={back} />
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton
          variant="brandIcon"
          label={quote ? t('common.save') : t('quote.create')}
          icon="pi pi-check"
          loading={pending}
          onClick={submit}
        />
      </div>
    )

  return (
    <AppDialog
      header={quote ? t('quote.edit') : t('quote.new')}
      visible={visible}
      onHide={onHide}
      footer={footer}
    >
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}
      {fieldErrors && (
        <UnmappedErrors
          errors={fieldErrors}
          mapped={['course_id', 'student_count', 'value_uf', 'purchase_order', 'planned_start_date', 'planned_end_date']}
        />
      )}

      {step === 1 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-slate-500">{t('quote.stepCourse')}</h3>
          <AppInputText
            leftIcon="pi pi-search"
            placeholder={t('quote.courseSearchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {fieldErrors?.course_id?.[0] && <p className="text-sm text-red-600">{fieldErrors.course_id[0]}</p>}
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {list.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <input
                  type="radio"
                  name="quote-course"
                  checked={form.course_id === c.id}
                  onChange={() => set('course_id', c.id as number)}
                />
                <span className="text-sm">
                  {c.name}
                  <span className="ml-2 text-slate-500">{c.workload_hours}h</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase text-slate-500">{t('quote.stepData')}</h3>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('quote.students')} error={fieldErrors?.student_count?.[0]}>
              <AppInputText
                value={String(form.student_count)}
                onChange={(e) => set('student_count', Number(e.target.value.replace(/\D/g, '')) || 0)}
                className="w-full"
              />
            </Field>

            {/* value_uf NUNCA vira Number: só sanitiza os caracteres e envia string. */}
            <Field label={t('quote.valueUf')} error={fieldErrors?.value_uf?.[0]}>
              <AppInputText
                value={form.value_uf}
                onChange={(e) => set('value_uf', e.target.value.replace(/[^\d.]/g, ''))}
                className="w-full"
              />
            </Field>
          </div>

          <Field label={t('quote.purchaseOrder')} error={fieldErrors?.purchase_order?.[0]}>
            <AppInputText
              value={form.purchase_order ?? ''}
              onChange={(e) => set('purchase_order', e.target.value || null)}
              className="w-full"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('quote.plannedStart')} error={fieldErrors?.planned_start_date?.[0]}>
              <input
                type="date"
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                value={form.planned_start_date ?? ''}
                onChange={(e) => set('planned_start_date', e.target.value || null)}
              />
            </Field>
            <Field label={t('quote.plannedEnd')} error={fieldErrors?.planned_end_date?.[0]}>
              <input
                type="date"
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                value={form.planned_end_date ?? ''}
                onChange={(e) => set('planned_end_date', e.target.value || null)}
              />
            </Field>
          </div>
        </section>
      )}
    </AppDialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

function UnmappedErrors({ errors, mapped }: { errors: Record<string, string[]>; mapped: string[] }) {
  const leftover = Object.entries(errors).filter(([key]) => !mapped.includes(key))
  if (leftover.length === 0) return null
  return (
    <ul className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {leftover.map(([key, msgs]) => (
        <li key={key}>{msgs[0]}</li>
      ))}
    </ul>
  )
}
```

Nota: `<input type="date">` e `type="radio"` são nativos, não PrimeReact — não violam a ADR-05 (a regra proíbe importar `primereact` fora de `shared/ui`, não usar HTML). Um wrapper `AppCalendar` seria o ideal, mas é escopo de outra task.

- [ ] **Step 3: Ações de editar/excluir na `QuotesList`**

Acrescentar as props opcionais e os botões por linha. Cotação **aprovada** não mostra editar/excluir — o backend devolve 422 nos dois (`Cotação aprovada não pode ser excluída. Recuse-a antes.`), então a UI não oferece o caminho morto:

```tsx
export function QuotesList({
  quotes, onEdit, onRemove,
}: {
  quotes: QuoteData[]
  onEdit?: (q: QuoteData) => void
  onRemove?: (q: QuoteData) => void
}) {
```

E, dentro do `map`, depois do valor em UF:

```tsx
          <div className="flex items-center gap-1">
            {q.status !== 'approved' && onEdit && (
              <AppButton icon="pi pi-pencil" text rounded onClick={() => onEdit(q)} />
            )}
            {q.status !== 'approved' && onRemove && (
              <AppButton icon="pi pi-trash" text rounded severity="danger" onClick={() => onRemove(q)} />
            )}
          </div>
```

Import de `AppButton` junto do `AppTag`: `import { AppTag, AppButton } from '@shared/ui'`.

- [ ] **Step 4: Plugar o wizard na `BudgetDetailPage`**

Acrescentar estado do wizard, o botão "Agregar cotización" no header e a exclusão:

```tsx
import { useState } from 'react'
import { useRemoveQuote } from '../../api/useQuotes'
import { QuoteWizard } from './QuoteWizard'
import type { QuoteData } from '@shared/types/generated'
```

Dentro do componente, antes do `return`:

```tsx
  // null = fechado; { quote: null } = criar; { quote } = editar.
  const [wizard, setWizard] = useState<{ quote: QuoteData | null } | null>(null)
  const removeQuote = useRemoveQuote()
```

No header, ao lado da tag de status:

```tsx
          <AppButton
            variant="brandIcon"
            label={t('budget.addQuote')}
            icon="pi pi-file"
            onClick={() => setWizard({ quote: null })}
          />
```

Na seção de cotações:

```tsx
        <QuotesList
          quotes={budget.quotes}
          onEdit={(q) => setWizard({ quote: q })}
          onRemove={(q) => removeQuote.mutate(q.id!)}
        />
```

E, no fim do JSX raiz:

```tsx
      {wizard && (
        <QuoteWizard visible budgetId={budgetId} quote={wizard.quote} onHide={() => setWizard(null)} />
      )}
```

- [ ] **Step 5: Build + lint + commit**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/features/commercial/hooks/useQuoteForm.ts frontend/src/features/commercial/components/Budget/QuoteWizard.tsx frontend/src/features/commercial/components/Budget/QuotesList.tsx frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx
git commit -m "feat(comercial): wizard de criação e edição de cotação"
```

---

### Task 7: Aprovação e recusa de cotação (Notion 6.2.4)

**Files:**
- Create: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx`
- Create: `frontend/src/shared/ui/ConfirmDialog/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`

**Interfaces:**
- Consumes: `useApproveQuote`/`useRejectQuote` (Task 2), `usePermissions` (`@shared/hooks`), `AppDialog`/`AppButton`.
- Produces: `ConfirmDialog` com props `{ visible, title, message, confirmLabel?, severity?, pending?, onConfirm, onCancel }`; `QuotesList` ganha `onApprove?: (q: QuoteData) => void` e `onReject?: (q: QuoteData) => void`.

- [ ] **Step 1: `shared/ui/ConfirmDialog/ConfirmDialog.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'

/** Confirmação de ação irreversível ou de peso legal (aprovar uma cotação libera
 * a turma na Operação). Apresentacional puro: não conhece feature nem mutação. */
export function ConfirmDialog({
  visible, title, message, confirmLabel, severity, pending, onConfirm, onCancel,
}: {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  severity?: 'danger'
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text onClick={onCancel} />
      <AppButton
        label={confirmLabel ?? t('common.save')}
        icon="pi pi-check"
        severity={severity}
        loading={pending}
        onClick={onConfirm}
      />
    </div>
  )

  return (
    <AppDialog header={title} visible={visible} onHide={onCancel} footer={footer}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </AppDialog>
  )
}
```

- [ ] **Step 2: Barrel do componente + barrel raiz**

`frontend/src/shared/ui/ConfirmDialog/index.ts`:

```ts
export * from './ConfirmDialog'
```

Em `frontend/src/shared/ui/index.ts`, acrescentar na lista (ordem alfabética entre `Clock` e `CrudDialog`):

```ts
export * from './ConfirmDialog'
```

- [ ] **Step 3: Botões de aprovar/recusar na `QuotesList`**

Props novas + regra por status. Aprovada → só Recusar. Pendente/recusada → Aprovar (e recusar só na pendente):

```tsx
export function QuotesList({
  quotes, onEdit, onRemove, onApprove, onReject,
}: {
  quotes: QuoteData[]
  onEdit?: (q: QuoteData) => void
  onRemove?: (q: QuoteData) => void
  onApprove?: (q: QuoteData) => void
  onReject?: (q: QuoteData) => void
}) {
```

No bloco de ações da linha, ANTES dos botões de editar/excluir:

```tsx
          <div className="flex items-center gap-2">
            {onReject && q.status !== 'rejected' && (
              <AppButton label={t('quote.reject')} severity="danger" outlined onClick={() => onReject(q)} />
            )}
            {onApprove && q.status !== 'approved' && (
              <AppButton variant="brandLabel" label={t('quote.approve')} onClick={() => onApprove(q)} />
            )}
          </div>
```

Nota: `brandLabel` e `brandIcon` são os únicos variants do `AppButton` (ver `shared/ui/AppButton/style.ts`). **Não** criar variant novo nesta task. `severity`/`outlined`/`text` vêm do `ButtonProps` do PrimeReact, já reexportado pelo wrapper.

- [ ] **Step 4: Confirmação + permissão na `BudgetDetailPage`**

Imports:

```tsx
import { ConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../../api/useQuotes'
```

Estado e mutações:

```tsx
  const { can } = usePermissions()
  const canApprove = can('commercial.quote.approve')
  const approve = useApproveQuote()
  const reject = useRejectQuote()
  const [confirm, setConfirm] = useState<{ action: 'approve' | 'reject'; quote: QuoteData } | null>(null)
```

Passar os handlers à lista — **só** se o usuário tiver a permissão. Esconder é conveniência de interface; a autorização real é do backend (ADR-07):

```tsx
        <QuotesList
          quotes={budget.quotes}
          onEdit={(q) => setWizard({ quote: q })}
          onRemove={(q) => removeQuote.mutate(q.id!)}
          onApprove={canApprove ? (q) => setConfirm({ action: 'approve', quote: q }) : undefined}
          onReject={canApprove ? (q) => setConfirm({ action: 'reject', quote: q }) : undefined}
        />
```

E o dialog de confirmação no fim do JSX raiz:

```tsx
      {confirm && (
        <ConfirmDialog
          visible
          title={t(confirm.action === 'approve' ? 'quote.confirmApproveTitle' : 'quote.confirmRejectTitle')}
          message={t(confirm.action === 'approve' ? 'quote.confirmApproveBody' : 'quote.confirmRejectBody')}
          confirmLabel={t(confirm.action === 'approve' ? 'quote.approve' : 'quote.reject')}
          severity={confirm.action === 'reject' ? 'danger' : undefined}
          pending={approve.isPending || reject.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const mutation = confirm.action === 'approve' ? approve : reject
            mutation.mutate(confirm.quote.id!, { onSuccess: () => setConfirm(null) })
          }}
        />
      )}
```

- [ ] **Step 5: Build + lint + commit**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/shared/ui/ConfirmDialog frontend/src/shared/ui/index.ts frontend/src/features/commercial/components/Budget/QuotesList.tsx frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx
git commit -m "feat(comercial): aprovação e recusa de cotação com confirmação"
```

---

### Task 8: Anexos do orçamento e da cotação

**Files:**
- Create: `frontend/src/features/commercial/components/Budget/FileList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`

**Interfaces:**
- Consumes: `useUploadBudgetFile`/`useRemoveBudgetFile`/`useUploadQuoteFile`/`useRemoveQuoteFile` + `BudgetFileType` (Task 2), `AppFileUpload`/`FileUploadHandlerEvent`/`AppButton`/`AppDropdown` (`@shared/ui`), `FileData.created_at` (Task 1).
- Produces: `FileList` com props `{ files: FileData[]; onRemove?: (fileId: number) => void }`.

- [ ] **Step 1: `FileList.tsx` (apresentacional)**

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { FileData } from '@shared/types/generated'

const KB = 1024

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm text-slate-500">{t('budget.noDocuments')}</p>
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
          <i className="pi pi-file text-slate-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{f.original_name}</p>
            <p className="text-xs text-slate-500">
              {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}
              {' · '}
              {Math.round(f.size / KB)} KB
            </p>
          </div>
          <a href={f.download_url} target="_blank" rel="noreferrer">
            <AppButton icon="pi pi-download" text rounded />
          </a>
          {onRemove && (
            <AppButton icon="pi pi-trash" text rounded severity="danger" onClick={() => onRemove(f.id)} />
          )}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Seção de documentos na `BudgetDetailPage`**

Imports:

```tsx
import { AppFileUpload, AppDropdown } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useUploadBudgetFile, useRemoveBudgetFile, type BudgetFileType } from '../../api/useCommercialFiles'
import { FileList } from './FileList'
```

Estado e handler (o `type` do anexo do orçamento é escolhido antes de subir — o backend só aceita `invoice`/`receipt`):

```tsx
  const [fileType, setFileType] = useState<BudgetFileType>('invoice')
  const uploadFile = useUploadBudgetFile()
  const removeFile = useRemoveBudgetFile()

  // e.options.clear() devolve o AppFileUpload ao estado vazio depois do envio
  // (mesmo padrão dos documentos do redator).
  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    uploadFile.mutate({ budgetId, type: fileType, file }, { onSuccess: () => e.options.clear() })
  }
```

Seção nova, depois da seção de cotações:

```tsx
      <section className="rounded-lg border border-slate-200 dark:border-slate-700">
        <header className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h3 className="font-medium">{t('budget.documents')}</h3>
          <div className="flex items-center gap-2">
            <div className="w-44">
              <AppDropdown
                value={fileType}
                options={[
                  { label: t('budget.fileTypeInvoice'), value: 'invoice' },
                  { label: t('budget.fileTypeReceipt'), value: 'receipt' },
                ]}
                onChange={(e) => setFileType(e.value as BudgetFileType)}
              />
            </div>
            <AppFileUpload
              chooseOptions={{ icon: 'pi pi-upload' }}
              chooseLabel={t('budget.uploadDocument')}
              disabled={uploadFile.isPending}
              uploadHandler={handleUpload}
            />
          </div>
        </header>
        <FileList files={budget.files ?? []} onRemove={(fileId) => removeFile.mutate({ budgetId, fileId })} />
      </section>
```

- [ ] **Step 3: Anexos da cotação na `QuotesList`**

Cada linha ganha os próprios anexos (`type` fixo `quote_document` — o hook já o fixa):

```tsx
import { AppTag, AppButton, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useUploadQuoteFile, useRemoveQuoteFile } from '../../api/useCommercialFiles'
import { FileList } from './FileList'
```

Dentro do componente:

```tsx
  const uploadFile = useUploadQuoteFile()
  const removeFile = useRemoveQuoteFile()

  const handleUpload = (quoteId: number, e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    uploadFile.mutate({ quoteId, file }, { onSuccess: () => e.options.clear() })
  }
```

E, dentro do `map`, abaixo do bloco de ações (num bloco de largura total — a linha vira `flex-wrap`):

```tsx
          <div className="w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">{t('quote.documents')}</span>
              <AppFileUpload
                chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                chooseLabel=""
                disabled={uploadFile.isPending}
                uploadHandler={(e) => handleUpload(q.id!, e)}
              />
            </div>
            <FileList files={q.files ?? []} onRemove={(fileId) => removeFile.mutate({ quoteId: q.id!, fileId })} />
          </div>
```

- [ ] **Step 4: Build + lint + commit**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/features/commercial/components/Budget/FileList.tsx frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx frontend/src/features/commercial/components/Budget/QuotesList.tsx
git commit -m "feat(comercial): anexos do orçamento e da cotação"
```

---

### Task 9: Limpeza das chaves órfãs

A aba de orçamentos substituiu o placeholder da Task 4; duas chaves ficaram sem consumidor.

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

- [ ] **Step 1: Provar que estão órfãs**

```bash
cd frontend && grep -rn "client.tabBudgets\|client.budgetsPlaceholder" src/ --include=*.tsx --include=*.ts
```
Expected: nenhum resultado (só os JSON de locale as contêm).

- [ ] **Step 2: Remover `tabBudgets` e `budgetsPlaceholder` do bloco `client` nos 3 locales**

- [ ] **Step 3: Reconferir a paridade das chaves**

```bash
cd frontend && for f in src/shared/config/locales/*.json; do echo -n "$f "; python3 -c "
import json
d=json.load(open('$f'))
print(sum(len(v) if isinstance(v,dict) else 1 for v in d.values()), 'chaves')
"; done
```
Expected: os 3 com o mesmo número.

- [ ] **Step 4: Build + lint + commit**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/shared/config/locales
git commit -m "chore(i18n): remove chaves órfãs do placeholder de orçamentos"
```

---

### Task 10: Verificação end-to-end contra a API real (gate do João)

Build e lint verdes **não** são o DoD (CLAUDE.md §4). Os três bugs mais graves da Sprint 1 (create de cliente sempre 422, `course_ids` descartado no create, upload chegando vazio) passaram por review de código e só a verificação real pegou.

**Não é task de subagente** — é o click-through do João, com o controller acompanhando.

- [ ] **Step 1: Subir o ambiente**

```bash
docker compose up -d
cd frontend && pnpm dev
```

- [ ] **Step 2: Roteiro (logado como superadmin)**

1. `/comercial` → aba Presupuestos → "Nuevo presupuesto" → escolher cliente + forma de pagamento → aparece na lista com `Scap N`, estado **Pendiente**, 0 cotizaciones, 0 UF.
2. Botão de olho → abre `/comercial/presupuestos/:id`. Recarregar a página (F5): o detalhe **sobrevive** (é rota, não dialog).
3. "Agregar cotización" → passo 1 escolhe curso → passo 2 preenche 20 alunos / 80 UF / OC / datas → criar. A lista de cotações e os três cards atualizam **sem reload**; "Total cotizado" = 80 UF.
4. Aprovar a cotação → confirmação → tag vira **Aprobada**; "Total aprobado" = 80 UF; o status do orçamento (no header e na lista) vira **Aprobado**; os botões editar/excluir **somem** daquela linha.
5. Recusar a mesma cotação → volta a editável; "Total rechazado" = 80 UF, "Total aprobado" = 0.
6. Editar a cotação recusada e salvar → ela **reabre como Pendiente**.
7. Subir uma fatura no orçamento e um documento na cotação → aparecem com nome, data e tamanho; o link de download **abre o arquivo** (se abrir vazio/0 KB, é a regressão do bug 3 do axios — parar e reportar).
8. Remover um anexo → some da lista.
9. Tentar excluir um orçamento que tenha cotação aprovada → o 422 aparece **na tela** (não some em silêncio).
10. Filtro de estado e busca por código/cliente na lista → funcionam.
11. Trocar o idioma → a tela inteira traduz (nenhuma chave crua tipo `budget.totalQuoted` aparecendo).

- [ ] **Step 3: Repetir os passos 3–5 logado como ADMIN**

Expected: os botões **Aprobar/Rechazar não existem** na tela. Criar orçamento e cotação continua funcionando.

- [ ] **Step 4: Registrar o resultado**

Anotar o que passou e o que falhou em `.superpowers/sdd/progress.md`, com evidência (status HTTP, mensagem). Bug encontrado aqui vira fix wave, não "minor para depois".

---

## Fora deste plano (bloqueado)

**Módulo Administração (Notion 2.4.2 / 2.4.3).** O backend não existe: só há o `SystemRoleGuard` (imutabilidade de role de sistema) e a permissão `identity.access.manage` semeada. Para as telas do protótipo (Usuarios / Roles y permisos) faltam, no mínimo:

- CRUD de usuário administrativo (listar admins/superadmins, criar com role, ativar/desativar, último acesso);
- `UserData` (o DTO foi removido como dead code na Sprint 1) + rotas;
- listagem de roles com suas permissions e a marca de "role de sistema" (imutável);
- catálogo de permissions agrupado por módulo (o protótipo mostra uma matriz módulo × ação);
- criação de role customizada com sync de permissions (usando o `SystemRoleGuard` já pronto).

Isso é um ciclo de **backend primeiro**, com spec e plano próprios.
