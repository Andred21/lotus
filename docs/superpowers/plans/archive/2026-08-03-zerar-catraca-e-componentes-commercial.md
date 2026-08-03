# Zerar a catraca de query-em-componente + abstração de `commercial` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** esvaziar a lista de `ignores` do `no-restricted-syntax` (7 componentes legados com query
dentro) e fechar os 6 achados estruturais de `features/commercial`, sem mudar comportamento
nenhum de tela.

**Architecture:** cada componente da catraca perde sua query para um hook novo em
`features/<x>/hooks/`, e sai de `ignores` no MESMO commit — a lista só encolhe. Em `commercial`,
os 4 componentes também perdem os blocos coesos presos em `.map`/ternário para subcomponentes
locais da própria feature. Nada sobe para `shared/`. Nenhum arquivo de `backend/` é tocado.

**Tech Stack:** React 19 + TS, TanStack Query, PrimeReact via `shared/ui`, Tailwind v4 (layout),
i18next. ESLint flat config (`frontend/eslint.config.js`).

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-03-zerar-catraca-e-componentes-commercial-design.md`
  (D1–D9). Em conflito, a spec vence este plano.
- **Não existe test runner no frontend.** O gate de verificação é `pnpm build` + `pnpm lint`
  (de `frontend/`), mais grep, mais prova de comportamento na tela pelo João nos checkpoints. Onde
  este plano diria "rode o teste", ele manda rodar build/lint/grep e comparar a tela.
- **Comportamento idêntico é o critério.** Nenhuma condicional muda de forma, nenhum texto muda,
  nenhuma chave i18n nova, nenhum estado novo de erro/vazio/loading. Melhoria percebida durante a
  execução vira nota para o João, não commit.
- **Zero arquivo de `backend/`** no diff. Zero diff em `frontend/src/shared/types/generated.ts` e em
  `frontend/src/shared/config/locales/`.
- **Nada sobe para `shared/`** neste bloco: os componentes extraídos têm vocabulário de domínio e
  ficam em `features/<x>/components/` (D5).
- **Estilo:** arquivos novos com aspas simples e sem ponto e vírgula (estilo dominante do repo, D9).
  O `ClientDialog.tsx` diverge disso hoje; o que sobra dele fica como está.
- **Um commit por task**, mensagem em Conventional Commits, escopo `frontend`.
- **Branch:** `refactor/zerar-catraca-e-componentes-commercial`, criada a partir do `main`, no main
  tree (sem worktree — D1).
- Comandos de frontend rodam de `frontend/`: `pnpm build`, `pnpm lint`.

## Estrutura de arquivos

**Criados (7 hooks):**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/features/commercial/hooks/useCommercialClients.ts` | query de clientes + `clientName`/`clientOptions`/`loadError` para as duas telas de orçamento |
| `frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts` | query de cursos + termo de busca + lista filtrada do passo 1 do wizard |
| `frontend/src/features/commercial/hooks/useQuotesListCourses.ts` | query de cursos + `courseName(id)` da lista de cotações |
| `frontend/src/features/commercial/hooks/useQuoteFiles.ts` | upload/remoção de documento de cotação + `sizeError` + `isUploading(quoteId)` |
| `frontend/src/features/catalog/hooks/useCourseRedatores.ts` | query de redatores + `allRedatores`/`enabledRedatores` + estados de erro |
| `frontend/src/features/identity/hooks/useStaffRoleOptions.ts` | query de roles + opções sem `redator` |
| `frontend/src/features/identity/hooks/useStudentClients.ts` | query condicional de clientes do create de aluno + `unusable`/`showEmptyHint` |

**Criados (6 componentes locais):**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/features/commercial/components/Client/ClientGeneralFields.tsx` | razón social, RUT, email, tipo, giro |
| `frontend/src/features/commercial/components/Client/ContactCard.tsx` | um contato (radio de principal, lixeira, 4 campos) |
| `frontend/src/features/commercial/components/Budget/QuoteRow.tsx` | uma linha da lista de cotações |
| `frontend/src/features/commercial/components/Budget/CourseStep.tsx` | passo 1 do wizard (busca + lista de cursos) |
| `frontend/src/features/commercial/components/Budget/DataStep.tsx` | passo 2 do wizard (alunos, UF, OC, datas) |
| `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx` | card de documentos do orçamento |

**Modificados:** os 7 componentes da catraca, `useClientForm.ts`, `ContactFields.tsx`,
`BudgetDetailPage.tsx`, `frontend/eslint.config.js`, `.claude/rules/frontend-fsliced.md`.

---

### Task 0: Branch

**Files:** nenhum arquivo de código.

- [ ] **Step 1: Confirmar árvore limpa e `main` atualizado**

```bash
cd /home/jvbat/projetos/lotus && git status --porcelain && git branch --show-current
```

Esperado: saída vazia do `status` e `main` como branch atual.

- [ ] **Step 2: Criar a branch**

```bash
git checkout -b refactor/zerar-catraca-e-componentes-commercial
```

- [ ] **Step 3: Baseline verde antes de tocar em qualquer coisa**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: build e lint verdes. Se o lint já falhar aqui, PARE — a catraca deveria estar segurando
os 7 legados, e falha na baseline significa outro problema, não este bloco.

- [ ] **Step 4: Registrar as 7 linhas que o bloco tem de matar**

```bash
cd /home/jvbat/projetos/lotus && grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/
```

Esperado: exatamente 7 linhas — `CourseDialog.tsx:22`, `QuoteWizard.tsx:20`, `QuotesList.tsx:23`,
`BudgetsTable.tsx:28`, `BudgetDialog.tsx:22`, `StaffUserDialog.tsx:31`, `StudentDialog.tsx:42`.
Este é o placar do bloco: cada task derruba as suas.

---

### Task 1: `useCommercialClients` — `BudgetsTable` + `BudgetDialog` saem da catraca

**Files:**
- Create: `frontend/src/features/commercial/hooks/useCommercialClients.ts`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx`
- Modify: `frontend/eslint.config.js` (remove 2 entradas de `ignores`)

**Interfaces:**
- Consumes: `clientsApi` (`@shared/api/clientsApi`), `ProblemDetails` (`@shared/api/axios`).
- Produces: `useCommercialClients(): { isLoading: boolean; loadError: ProblemDetails | null;
  refetch: () => void; clientName: (id: number) => string; clientOptions: { label: string; value:
  number | undefined }[] }`.

- [ ] **Step 1: Criar o hook**

Arquivo `frontend/src/features/commercial/hooks/useCommercialClients.ts`:

```ts
import { clientsApi } from '@shared/api/clientsApi'
import type { ProblemDetails } from '@shared/api/axios'

/** Clientes das duas telas de orçamento: a tabela resolve o nome por id, o
 * diálogo monta as opções do dropdown. Um hook só para os dois consumidores —
 * é a mesma lista e o mesmo lookup, e a chave do TanStack já é compartilhada. */
export function useCommercialClients() {
  const clients = clientsApi.useList()

  return {
    isLoading: clients.isLoading,
    /** Falha do GET no formato que `AppDataTable`/`AppErrorState` leem. `{}` quando
     * o interceptor não populou o corpo: `isError` sem `error` ainda é falha, e
     * devolver `null` a esconderia. */
    loadError: clients.isError ? (clients.error ?? ({} as ProblemDetails)) : null,
    refetch: () => {
      void clients.refetch()
    },
    clientName: (id: number) => clients.data?.find((c) => c.id === id)?.legal_name ?? '—',
    clientOptions: (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id })),
  }
}
```

- [ ] **Step 2: Trocar a query no `BudgetsTable`**

Em `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`, remova o import da API e
acrescente o do hook:

```diff
-import { clientsApi } from '@shared/api/clientsApi'
 import { quoteStatusSeverity } from '../../lib/quoteStatus'
 import { formatUf } from '../../lib/uf'
+import { useCommercialClients } from '../../hooks/useCommercialClients'
```

Troque as linhas 28–37 por:

```tsx
  const clients = useCommercialClients()

  // A falha da query auxiliar conta como falha da tabela. Sem isso um GET de
  // clientes quebrado deixava a tabela inteira com `—` na coluna Cliente e a
  // busca por cliente devolvendo vazio, tudo em silêncio — a tela afirmaria que
  // esses orçamentos não têm cliente (spec D16). Reintentar recarrega as duas.
  const loadError = error ?? clients.loadError
  const retry = () => { onRetry?.(); clients.refetch() }
```

O `clientName` local morre; os 2 usos passam a chamar o do hook:

```diff
   const table = useTableFilter(
     budgets,
-    (b) => [b.code, clientName(b.client_id)],
+    (b) => [b.code, clients.clientName(b.client_id)],
     status === null ? undefined : (b) => b.status === status,
   )
```

```diff
-        <AppColumn header={t('budget.client')} body={(b: BudgetData) => clientName(b.client_id)} />
+        <AppColumn header={t('budget.client')} body={(b: BudgetData) => clients.clientName(b.client_id)} />
```

A linha `loading={loading || clients.isLoading}` do `AppDataTable` **não muda de texto** — `clients`
agora é o hook, e o campo tem o mesmo nome. Confira que continua lá.

- [ ] **Step 3: Trocar a query no `BudgetDialog`**

Em `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx`:

```diff
-import { clientsApi } from '@shared/api/clientsApi'
 import { useBudgetForm, type BudgetDialogMode } from '../../hooks/useBudgetForm'
+import { useCommercialClients } from '../../hooks/useCommercialClients'
```

```diff
-  const clients = clientsApi.useList()
-
-  const isCreate = mode === 'create'
-  const clientOptions = (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id }))
+  const { clientOptions } = useCommercialClients()
+
+  const isCreate = mode === 'create'
```

- [ ] **Step 4: Tirar os dois arquivos da catraca**

Em `frontend/eslint.config.js`, apague estas duas linhas do array `ignores`:

```
      'src/features/commercial/components/Budget/BudgetDialog.tsx',
      'src/features/commercial/components/Budget/BudgetsTable.tsx',
```

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: ambos verdes. Se o lint reprovar apontando `BudgetsTable`/`BudgetDialog`, sobrou query no
componente — o hook não foi adotado em algum ponto.

```bash
cd /home/jvbat/projetos/lotus && grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/ | wc -l
```

Esperado: `5`.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/commercial/hooks/useCommercialClients.ts \
        frontend/src/features/commercial/components/Budget/BudgetsTable.tsx \
        frontend/src/features/commercial/components/Budget/BudgetDialog.tsx \
        frontend/eslint.config.js
git commit -m "refactor(frontend): clientes de orcamento vao para useCommercialClients

BudgetsTable e BudgetDialog saem do ignores do no-restricted-syntax no mesmo
commit que perde a query. O merge do erro da query auxiliar com o erro que vem
por prop fica na tabela: e derivacao, nao busca de dado."
```

---

### Task 2: `useQuoteCourseSearch` — `QuoteWizard` sai da catraca

**Files:**
- Create: `frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts`
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: `coursesApi` (`@shared/api/coursesApi`).
- Produces: `useQuoteCourseSearch(): { list: CourseData[]; search: string; setSearch: (v: string)
  => void }`.

- [ ] **Step 1: Criar o hook**

Arquivo `frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts`:

```ts
import { useState } from 'react'
import { coursesApi } from '@shared/api/coursesApi'

/** Busca de curso do passo 1 do wizard de cotação: query, termo e lista filtrada.
 *
 * O `?? []` é o comportamento de hoje e fica: distinguir GET falho de catálogo
 * vazio muda o que a tela afirma e é o B-7, débito registrado no backlog, fora
 * deste bloco. Por isso o hook NÃO expõe `isError` — API que ninguém consome
 * mentiria sobre o que esta tela trata. */
export function useQuoteCourseSearch() {
  const courses = coursesApi.useList()
  const [search, setSearch] = useState('')

  const list = (courses.data ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return { list, search, setSearch }
}
```

- [ ] **Step 2: Adotar no `QuoteWizard`**

Em `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`:

```diff
-import { useState } from 'react'
 import { useTranslation } from 'react-i18next'
 import { AppDialog, AppButton, AppInputText, AppRadioButton, AppDatePicker, FormField, FormSection, FormErrorSummary, FormErrorBanner } from '@shared/ui'
 import type { QuoteData } from '@shared/types/generated'
-import { coursesApi } from '@shared/api/coursesApi'
 import { useQuoteForm } from '../../hooks/useQuoteForm'
+import { useQuoteCourseSearch } from '../../hooks/useQuoteCourseSearch'
 import { parseUfInput } from '../../lib/uf'
```

```diff
-  const courses = coursesApi.useList()
-  const [search, setSearch] = useState('')
-
-  const list = (courses.data ?? []).filter((c) =>
-    c.name.toLowerCase().includes(search.trim().toLowerCase()),
-  )
+  const { list, search, setSearch } = useQuoteCourseSearch()
```

O JSX não muda: `value={search}`, `onChange={(e) => setSearch(e.target.value)}` e `list.map(...)`
continuam idênticos.

- [ ] **Step 3: Tirar o arquivo da catraca**

Em `frontend/eslint.config.js`, apague:

```
      'src/features/commercial/components/Budget/QuoteWizard.tsx',
```

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: verdes.

```bash
cd /home/jvbat/projetos/lotus && grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/ | wc -l
```

Esperado: `4`.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts \
        frontend/src/features/commercial/components/Budget/QuoteWizard.tsx \
        frontend/eslint.config.js
git commit -m "refactor(frontend): busca de curso do wizard vai para useQuoteCourseSearch

QuoteWizard sai do ignores. O ?? [] fica como esta: tratar GET falho e o B-7,
debito registrado, e mudaria comportamento."
```

---

### Task 3: `useQuoteFiles` + `useQuotesListCourses` — `QuotesList` sai da catraca

**Files:**
- Create: `frontend/src/features/commercial/hooks/useQuoteFiles.ts`
- Create: `frontend/src/features/commercial/hooks/useQuotesListCourses.ts`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: `useUploadQuoteFile`/`useRemoveQuoteFile` (`../api/useCommercialFiles`),
  `useMutationErrors` (`@shared/hooks`), `FileUploadHandlerEvent` (`@shared/ui`), `coursesApi`.
- Produces:
  - `useQuoteFiles(): { upload: (quoteId: number, e: FileUploadHandlerEvent) => void; remove:
    (quoteId: number, fileId: number) => void; isUploading: (quoteId: number) => boolean;
    fileError: string | null; sizeError: string | null; setSizeError: (m: string | null) => void }`
  - `useQuotesListCourses(): { courseName: (id: number) => string }`

- [ ] **Step 1: Criar `useQuotesListCourses`**

Arquivo `frontend/src/features/commercial/hooks/useQuotesListCourses.ts`:

```ts
import { coursesApi } from '@shared/api/coursesApi'

/** Nome do curso por id para a lista de cotações. Só lookup: a lista não tem
 * onde mostrar erro de GET de curso (o `—` é o fallback de hoje), e mudar isso
 * é o B-7 — fora deste bloco. */
export function useQuotesListCourses() {
  const courses = coursesApi.useList()

  return {
    courseName: (id: number) => courses.data?.find((c) => c.id === id)?.name ?? '—',
  }
}
```

- [ ] **Step 2: Criar `useQuoteFiles`**

Arquivo `frontend/src/features/commercial/hooks/useQuoteFiles.ts`:

```ts
import { useState } from 'react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import { useUploadQuoteFile, useRemoveQuoteFile } from '../api/useCommercialFiles'

/** Documentos de cotação: um input de upload por linha da lista. Molde:
 * `useImportStudentsFlow` — `sizeError` e a mutation mudam juntos e são o mesmo
 * assunto ("este envio falhou"), então moram no mesmo hook.
 *
 * Rejeição por tamanho é local (não passa pela API): o AppFileUpload barra o
 * arquivo antes de qualquer request, então não vira erro de mutação. */
export function useQuoteFiles() {
  const uploadFile = useUploadQuoteFile()
  const removeFile = useRemoveQuoteFile()
  // `message`: o upload é um único input por linha, sem campo onde pendurar o
  // 422 de "file"/"type" — o hook já resolve o fallback.
  const { message: fileError } = useMutationErrors([uploadFile.error, removeFile.error])
  const [sizeError, setSizeError] = useState<string | null>(null)

  const upload = (quoteId: number, e: FileUploadHandlerEvent) => {
    // Zera a rejeição da tentativa anterior antes de tentar de novo — era o que
    // o `onClick` do componente fazia à mão.
    setSizeError(null)
    const file = e.files[0]
    if (!file) return
    uploadFile.mutate({ quoteId, file }, { onSuccess: () => e.options.clear() })
  }

  return {
    upload,
    remove: (quoteId: number, fileId: number) => removeFile.mutate({ quoteId, fileId }),
    /** Só a linha em voo desabilita o próprio botão — o `disabled` é por cotação,
     * nunca da lista inteira. */
    isUploading: (quoteId: number) =>
      uploadFile.isPending && uploadFile.variables?.quoteId === quoteId,
    fileError,
    sizeError,
    setSizeError,
  }
}
```

- [ ] **Step 3: Adotar no `QuotesList`**

Em `frontend/src/features/commercial/components/Budget/QuotesList.tsx`, o topo do arquivo (linhas
1–39) passa a ser:

```tsx
import { useTranslation } from 'react-i18next'
import { AppTag, AppButton, AppFileUpload, FormErrorBanner } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useQuoteFiles } from '../../hooks/useQuoteFiles'
import { useQuotesListCourses } from '../../hooks/useQuotesListCourses'
import { FileList } from './FileList'

export function QuotesList({
  quotes, onEdit, onRemove, onApprove, onReject,
}: {
  quotes: QuoteData[]
  onEdit?: (q: QuoteData) => void
  onRemove?: (q: QuoteData) => void
  onApprove?: (q: QuoteData) => void
  onReject?: (q: QuoteData) => void
}) {
  const { t } = useTranslation()
  const { courseName } = useQuotesListCourses()
  const files = useQuoteFiles()
```

O `import { useState } from 'react'`, o `import type { FileUploadHandlerEvent }`, o
`import { useMutationErrors }`, o `import { coursesApi }` e o
`import { useUploadQuoteFile, useRemoveQuoteFile }` saem.

No JSX, o banner de erro:

```diff
-        <FormErrorBanner message={fileError} />
-        {sizeError && <FormErrorBanner message={sizeError} />}
+        <FormErrorBanner message={files.fileError} />
+        {files.sizeError && <FormErrorBanner message={files.sizeError} />}
```

O upload e a remoção da linha:

```diff
-                  disabled={uploadFile.isPending && uploadFile.variables?.quoteId === q.id}
-                  onSizeReject={setSizeError}
-                  uploadHandler={(e) => { setSizeError(null); handleUpload(q.id!, e) }}
+                  disabled={files.isUploading(q.id!)}
+                  onSizeReject={files.setSizeError}
+                  uploadHandler={(e) => files.upload(q.id!, e)}
```

```diff
-              <FileList files={q.files ?? []} onRemove={(fileId) => removeFile.mutate({ quoteId: q.id!, fileId })} />
+              <FileList files={q.files ?? []} onRemove={(fileId) => files.remove(q.id!, fileId)} />
```

O `courseName(q.course_id)` do markup não muda de texto — agora vem do hook.

- [ ] **Step 4: Tirar o arquivo da catraca**

Em `frontend/eslint.config.js`, apague:

```
      'src/features/commercial/components/Budget/QuotesList.tsx',
```

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: verdes.

```bash
cd /home/jvbat/projetos/lotus && grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/ | wc -l
```

Esperado: `3` (só os de `catalog` e `identity`).

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/commercial/hooks/useQuoteFiles.ts \
        frontend/src/features/commercial/hooks/useQuotesListCourses.ts \
        frontend/src/features/commercial/components/Budget/QuotesList.tsx \
        frontend/eslint.config.js
git commit -m "refactor(frontend): QuotesList perde mutations e lookup para dois hooks

useQuoteFiles absorve upload/remocao/sizeError/pending-por-linha (molde
useImportStudentsFlow); useQuotesListCourses fica so com o courseName. Sao duas
razoes de mudar diferentes: um sabe de mutation, o outro so le.
QuotesList sai do ignores — restam 3 (catalog, identity)."
```

---

### Task 4: `useClientForm` devolve `addr`; `EMPTY_ADDRESS` duplicado morre (B-1)

**Files:**
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`

**Interfaces:**
- Produces: `useClientForm(...)` passa a devolver, além do que já devolve,
  `addr: ClientAddressData` — o primeiro endereço do form, ou `EMPTY_ADDRESS` quando não há.

- [ ] **Step 1: Expor `addr` no hook**

Em `frontend/src/features/commercial/hooks/useClientForm.ts`, no `return` final:

```diff
   return {
     form, set, readOnly, submit,
+    // Cliente criado fora da UI (seed/API) pode não ter endereço — cai para o
+    // vazio em vez de quebrar ao ler `addr.region`. Resolvido aqui porque a
+    // constante que define "endereço vazio" já mora neste arquivo; tê-la também
+    // no componente eram duas fontes para o mesmo default.
+    addr: form.addresses[0] ?? EMPTY_ADDRESS,
     setAddr, patchContact, setPrimaryContact, addContact, removeContact,
     pending: create.isPending || update.isPending,
     fieldErrors, generalError,
   }
```

- [ ] **Step 2: Consumir no `ClientDialog` e matar a duplicata**

Em `frontend/src/features/commercial/components/Client/ClientDialog.tsx`:

```diff
-import type { ClientAddressData, ClientData } from "@shared/types/generated";
+import type { ClientData } from "@shared/types/generated";
```

```diff
 const TYPE_VALUES = ["client", "provider", "other"] as const;
-
-const EMPTY_ADDRESS: ClientAddressData = {
-  id: undefined,
-  line1: null,
-  line2: null,
-  number: null,
-  commune: null,
-  city: null,
-  region: null,
-  zip_code: null,
-  is_primary: true,
-};
```

```diff
   const {
     form,
     set,
     readOnly,
     submit,
     pending,
     fieldErrors,
     generalError,
+    addr,
     setAddr,
     patchContact,
     setPrimaryContact,
     addContact,
     removeContact,
   } = useClientForm(client, mode, onHide, (created) =>
     photo.flush(created.id as number),
   );
```

```diff
-  // Cliente criado fora da UI (seed/API) pode não ter endereço — cai para vazio
-  // em vez de quebrar ao ler `addr.region`.
-  const addr = form.addresses[0] ?? EMPTY_ADDRESS;
-
```

O uso `<AddressFields value={addr} ... />` não muda.

- [ ] **Step 3: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes. O build é quem prova que o `ClientAddressData` removido do import não era usado em
outro ponto do arquivo.

```bash
cd /home/jvbat/projetos/lotus && grep -rn "EMPTY_ADDRESS" frontend/src/
```

Esperado: só `frontend/src/features/commercial/hooks/useClientForm.ts` (3 ocorrências: declaração,
uso no `EMPTY`, uso no `setAddr`, mais a nova no `return`).

- [ ] **Step 4: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/commercial/hooks/useClientForm.ts \
        frontend/src/features/commercial/components/Client/ClientDialog.tsx
git commit -m "refactor(frontend): EMPTY_ADDRESS deixa de existir em dois lugares

O default de endereco vazio mora onde a constante ja morava: useClientForm passa
a devolver addr resolvido e o ClientDialog so consome."
```

---

### Task 5: `ClientGeneralFields` + `ContactCard` (B-2, B-3)

**Files:**
- Create: `frontend/src/features/commercial/components/Client/ClientGeneralFields.tsx`
- Create: `frontend/src/features/commercial/components/Client/ContactCard.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ContactFields.tsx`

**Interfaces:**
- Produces:
  - `ClientGeneralFields(props: { form: ClientData; readOnly: boolean; fieldErrors?:
    Record<string, string[]> | null; onChange: <K extends keyof ClientData>(k: K, v: ClientData[K])
    => void })`
  - `ContactCard(props: { contact: ClientData['contacts'][number]; index: number; readOnly: boolean;
    isLast: boolean; fieldErrors?: Record<string, string[]> | null; onPatch: (patch:
    Partial<ClientData['contacts'][number]>) => void; onSetPrimary: () => void; onRemove: () =>
    void })`

- [ ] **Step 1: Criar `ClientGeneralFields`**

Arquivo `frontend/src/features/commercial/components/Client/ClientGeneralFields.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppInputText, AppDropdown, FormField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

const TYPE_VALUES = ['client', 'provider', 'other'] as const

/** Dados gerais da empresa: razón social, RUT, email, tipo e giro. Subcomponente
 * local de `commercial` (não `shared/ui`): tem vocabulário de domínio. A foto
 * fica no diálogo — quem a alimenta é o `useEntityPhoto` de lá, e trazê-la para
 * cá custaria repassar 8 props por um componente que é sobre campos de texto. */
export function ClientGeneralFields({
  form, readOnly, fieldErrors, onChange,
}: {
  form: ClientData
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onChange: <K extends keyof ClientData>(k: K, v: ClientData[K]) => void
}) {
  const { t } = useTranslation()
  const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))

  return (
    <>
      {/* Empresa não tem "nome" separado da razón social — `name` (exigido
          pelo backend) é derivado de `legal_name` no submit. Erro de `name`
          aparece aqui pois foi este campo que o gerou. */}
      <FormField
        label={t('client.legalName')}
        error={fieldErrors?.legal_name?.[0] ?? fieldErrors?.name?.[0]}
      >
        <AppInputText
          value={form.legal_name}
          disabled={readOnly}
          onChange={(e) => onChange('legal_name', e.target.value)}
          className="w-full"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]}>
          <AppInputText
            value={form.rut}
            disabled={readOnly}
            onChange={(e) => onChange('rut', e.target.value)}
            className="w-full"
          />
        </FormField>
        <FormField label={t('common.email')} error={fieldErrors?.email?.[0]}>
          <AppInputText
            value={form.email}
            disabled={readOnly}
            onChange={(e) => onChange('email', e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('client.type')}>
          <AppDropdown
            value={form.type}
            options={types}
            disabled={readOnly}
            onChange={(e) => onChange('type', e.value)}
          />
        </FormField>
        <FormField label={t('client.businessActivity')}>
          <AppInputText
            value={form.business_activity ?? ''}
            disabled={readOnly}
            onChange={(e) => onChange('business_activity', e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Adotar no `ClientDialog`**

Em `frontend/src/features/commercial/components/Client/ClientDialog.tsx`, o `TYPE_VALUES` local e o
`types` derivado saem (migraram para o subcomponente), e os 5 campos viram uma linha:

```diff
 import {
   CrudDialog,
-  AppInputText,
-  AppDropdown,
-  FormField,
   FormSection,
   FormErrorSummary,
   FormErrorBanner,
   AppPhotoField,
 } from "@shared/ui";
```

O `useTranslation` **fica**: o diálogo ainda usa `t` no título, nas seções e no banner de foto.

```diff
 import { AddressFields } from "./AddressFields";
 import { ContactFields } from "./ContactFields";
-
-const TYPE_VALUES = ["client", "provider", "other"] as const;
+import { ClientGeneralFields } from "./ClientGeneralFields";
```

```diff
-  const types = TYPE_VALUES.map((value) => ({
-    value,
-    label: t(`clientType.${value}`),
-  }));
-
```

Todo o trecho que hoje vai do `<FormField label={t("client.legalName")}>` até o fechamento do
segundo `<div className="grid gap-4 sm:grid-cols-2">` (os 5 campos) vira:

```tsx
        <ClientGeneralFields
          form={form}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          onChange={set}
        />
```

- [ ] **Step 3: Criar `ContactCard`**

Arquivo `frontend/src/features/commercial/components/Client/ContactCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton, AppCard, AppInputText, AppRadioButton, AppTag, FormField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

/** Um contato do cliente. O principal usa `tone="info"` do AppCard mais um
 * AppTag: antes, "principal" era só um radio com `title`, invisível sem hover.
 * Os campos usam FormField (label + erro) e não NestedField, que por contrato
 * não tem label — o rótulo só existia como placeholder, que some ao digitar.
 *
 * `index` entra porque a chave do erro é posicional (`contacts.<i>.<campo>`),
 * como o 422 do backend a devolve. */
export function ContactCard({
  contact, index, readOnly, isLast, fieldErrors, onPatch, onSetPrimary, onRemove,
}: {
  contact: ClientData['contacts'][number]
  index: number
  readOnly: boolean
  isLast: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (patch: Partial<ClientData['contacts'][number]>) => void
  onSetPrimary: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()

  return (
    <AppCard tone={contact.is_primary ? 'info' : 'neutral'}>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <AppRadioButton
              name="primaryContact"
              checked={contact.is_primary}
              disabled={readOnly}
              aria-label={t('client.contactPrimary')}
              onChange={onSetPrimary}
            />
            {contact.is_primary && (
              <AppTag value={t('client.contactPrimaryTag')} severity="info" />
            )}
          </label>

          {!readOnly && (
            <span title={isLast ? t('client.lastContactHint') : t('client.removeContact')}>
              <AppButton
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                disabled={isLast}
                aria-label={t('client.removeContact')}
                onClick={onRemove}
              />
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label={t('client.contactName')}
            error={fieldErrors?.[`contacts.${index}.name`]?.[0]}
          >
            <AppInputText
              value={contact.name}
              disabled={readOnly}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="w-full"
            />
          </FormField>
          <FormField
            label={t('client.contactJobTitle')}
            error={fieldErrors?.[`contacts.${index}.job_title`]?.[0]}
          >
            <AppInputText
              value={contact.job_title ?? ''}
              disabled={readOnly}
              onChange={(e) => onPatch({ job_title: e.target.value })}
              className="w-full"
            />
          </FormField>
          <FormField
            label={t('common.email')}
            error={fieldErrors?.[`contacts.${index}.email`]?.[0]}
          >
            <AppInputText
              value={contact.email ?? ''}
              disabled={readOnly}
              onChange={(e) => onPatch({ email: e.target.value })}
              className="w-full"
            />
          </FormField>
          <FormField
            label={t('common.phone')}
            error={fieldErrors?.[`contacts.${index}.phone`]?.[0]}
          >
            <AppInputText
              value={contact.phone ?? ''}
              disabled={readOnly}
              onChange={(e) => onPatch({ phone: e.target.value })}
              className="w-full"
            />
          </FormField>
        </div>
      </div>
    </AppCard>
  )
}
```

- [ ] **Step 4: `ContactFields` passa a ser só a lista**

O arquivo `frontend/src/features/commercial/components/Client/ContactFields.tsx` inteiro vira:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'
import { ContactCard } from './ContactCard'

/** Lista de contatos do cliente. `key={i}` (não `id`): o backend replace-total
 * recria os nested e o id muda a cada save — o índice é a identidade estável.
 * Cada contato é um card (spec D12). */
export function ContactFields({
  contacts, readOnly, fieldErrors, onPatch, onSetPrimary, onAdd, onRemove,
}: {
  contacts: ClientData['contacts']
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (i: number, patch: Partial<ClientData['contacts'][number]>) => void
  onSetPrimary: (i: number) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const { t } = useTranslation()
  const isLast = contacts.length <= 1

  return (
    <div className="space-y-3">
      {contacts.map((c, i) => (
        <ContactCard
          key={i}
          contact={c}
          index={i}
          readOnly={readOnly}
          isLast={isLast}
          fieldErrors={fieldErrors}
          onPatch={(patch) => onPatch(i, patch)}
          onSetPrimary={() => onSetPrimary(i)}
          onRemove={() => onRemove(i)}
        />
      ))}

      {!readOnly && (
        <AppButton
          label={t('client.addContact')}
          icon="pi pi-user-plus"
          text
          onClick={onAdd}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes.

```bash
cd /home/jvbat/projetos/lotus && wc -l frontend/src/features/commercial/components/Client/ClientDialog.tsx
```

Esperado: em torno de 110 linhas (era 199).

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/commercial/components/Client/
git commit -m "refactor(frontend): ClientGeneralFields e ContactCard saem do ClientDialog

Os 5 campos gerais e o corpo do .map de contatos viram subcomponentes locais de
commercial. ClientDialog cai de 199 para ~110 linhas; a foto fica no dialogo,
onde vive o useEntityPhoto que a alimenta."
```

---

### Task 6: `QuoteRow`, `CourseStep`/`DataStep`, `BudgetDocumentsCard` (B-4, B-5, B-6)

**Files:**
- Create: `frontend/src/features/commercial/components/Budget/QuoteRow.tsx`
- Create: `frontend/src/features/commercial/components/Budget/CourseStep.tsx`
- Create: `frontend/src/features/commercial/components/Budget/DataStep.tsx`
- Create: `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`

**Interfaces:**
- Consumes: `QuoteFormFields` (`../../hooks/useQuoteForm`), `BudgetFileType`
  (`../../api/useCommercialFiles`), `FileUploadHandlerEvent` (`@shared/ui`).
- Produces:
  - `QuoteRow(props: { quote: QuoteData; striped: boolean; courseName: string; uploading: boolean;
    onEdit?: () => void; onRemove?: () => void; onApprove?: () => void; onReject?: () => void;
    onUpload: (e: FileUploadHandlerEvent) => void; onRemoveFile: (fileId: number) => void;
    onSizeReject: (message: string) => void })`
  - `CourseStep(props: { list: CourseData[]; search: string; onSearch: (v: string) => void;
    selectedId: number; onSelect: (id: number) => void })`
  - `DataStep(props: { form: QuoteFormFields; fieldErrors?: Record<string, string[]> | null;
    onChange: <K extends keyof QuoteFormFields>(k: K, v: QuoteFormFields[K]) => void })`
  - `BudgetDocumentsCard(props: { files: FileData[]; fileType: BudgetFileType; onFileTypeChange:
    (t: BudgetFileType) => void; uploadPending: boolean; onUpload: (e: FileUploadHandlerEvent) =>
    void; onSizeReject: (message: string) => void; onRemove: (fileId: number) => void; fileError:
    string | null; fileSizeError: string | null })`

- [ ] **Step 1: Criar `QuoteRow`**

Arquivo `frontend/src/features/commercial/components/Budget/QuoteRow.tsx` — markup movido literal
do `.map` do `QuotesList`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppTag, AppButton, AppFileUpload, type FileUploadHandlerEvent } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { FileList } from './FileList'

/** Uma cotação da lista do orçamento. `striped` vem do índice: alternância como
 * separação de item (spec D4) — lista empilhada, não tabela. */
export function QuoteRow({
  quote, striped, courseName, uploading,
  onEdit, onRemove, onApprove, onReject,
  onUpload, onRemoveFile, onSizeReject,
}: {
  quote: QuoteData
  striped: boolean
  courseName: string
  uploading: boolean
  onEdit?: () => void
  onRemove?: () => void
  onApprove?: () => void
  onReject?: () => void
  onUpload: (e: FileUploadHandlerEvent) => void
  onRemoveFile: (fileId: number) => void
  onSizeReject: (message: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 first:border-t-0"
      style={{
        borderColor: 'var(--surface-border)',
        background: striped ? 'var(--surface-section)' : 'transparent',
      }}
    >
      <div className="min-w-64 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{courseName}</span>
          {quote.status && (
            <AppTag value={t(`quoteStatus.${quote.status}`)} severity={quoteStatusSeverity(quote.status)} />
          )}
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('quote.studentsShort', { count: quote.student_count })}
          {quote.planned_start_date && ` · ${quote.planned_start_date}`}
          {quote.planned_end_date && ` – ${quote.planned_end_date}`}
        </p>
        {quote.status === 'rejected' && (
          <p className="mt-1 text-sm" style={{ color: 'var(--red-500)' }}>{t('quote.rejectedNote')}</p>
        )}
      </div>

      <span className="font-semibold">{formatUf(quote.value_uf)} UF</span>

      <div className="flex items-center gap-2">
        {onReject && quote.status !== 'rejected' && (
          <AppButton label={t('quote.reject')} severity="danger" outlined onClick={onReject} />
        )}
        {onApprove && quote.status !== 'approved' && (
          <AppButton variant="brandLabel" label={t('quote.approve')} onClick={onApprove} />
        )}
      </div>

      <div className="flex items-center gap-1">
        {quote.status !== 'approved' && onEdit && (
          <AppButton icon="pi pi-pencil" text rounded aria-label={t('common.edit')} onClick={onEdit} />
        )}
        {quote.status !== 'approved' && onRemove && (
          <AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={onRemove} />
        )}
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-color-secondary)' }}>
            {t('quote.documents')}
          </span>
          <AppFileUpload
            chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
            chooseLabel=""
            // aria-label no span clicável do modo básico via passthrough tipado:
            // o FileUpload do Prime descarta chaves desconhecidas de chooseOptions.
            pt={{ basicButton: { 'aria-label': t('common.upload') } }}
            disabled={uploading}
            onSizeReject={onSizeReject}
            uploadHandler={onUpload}
          />
        </div>
        <FileList files={quote.files ?? []} onRemove={onRemoveFile} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `QuotesList` passa a ser só a lista**

O corpo do `return` do `frontend/src/features/commercial/components/Budget/QuotesList.tsx` vira:

```tsx
  return (
    <div>
      <div className="m-4 empty:m-0">
        <FormErrorBanner message={files.fileError} />
        {files.sizeError && <FormErrorBanner message={files.sizeError} />}
      </div>
      {/* Contêiner próprio: `first:border-t-0` mira o primeiro filho DESTA div,
       * não o primeiro filho do wrapper de cima (que sempre existe por causa do
       * banner de erro, mesmo vazio). */}
      <div>
        {quotes.map((q, i) => (
          <QuoteRow
            key={q.id}
            quote={q}
            striped={i % 2 === 1}
            courseName={courseName(q.course_id)}
            uploading={files.isUploading(q.id!)}
            onEdit={onEdit ? () => onEdit(q) : undefined}
            onRemove={onRemove ? () => onRemove(q) : undefined}
            onApprove={onApprove ? () => onApprove(q) : undefined}
            onReject={onReject ? () => onReject(q) : undefined}
            onUpload={(e) => files.upload(q.id!, e)}
            onRemoveFile={(fileId) => files.remove(q.id!, fileId)}
            onSizeReject={files.setSizeError}
          />
        ))}
      </div>
    </div>
  )
```

Os imports que só o `QuoteRow` usa agora saem do `QuotesList` (`AppTag`, `AppButton`,
`AppFileUpload`, `quoteStatusSeverity`, `formatUf`, `FileList`); ficam `useTranslation`,
`FormErrorBanner`, `QuoteData`, os dois hooks e o `QuoteRow`. O early return de lista vazia
(`quotes.length === 0`) não muda.

- [ ] **Step 3: Criar `CourseStep` e `DataStep`**

Arquivo `frontend/src/features/commercial/components/Budget/CourseStep.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppInputText, AppRadioButton, FormSection } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

/** Passo 1 do wizard: escolher o curso. A busca é do passo, não do form — por
 * isso o termo vem por prop do hook, e não do `useQuoteForm`. */
export function CourseStep({
  list, search, onSearch, selectedId, onSelect,
}: {
  list: CourseData[]
  search: string
  onSearch: (value: string) => void
  selectedId: number
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-3">
      <FormSection title={t('quote.stepCourse')} />
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('quote.courseSearchPlaceholder')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {list.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <AppRadioButton
              name="quote-course"
              checked={selectedId === c.id}
              onChange={() => onSelect(c.id as number)}
            />
            <span className="text-sm">
              {c.name}
              <span className="ml-2 text-slate-500">{c.workload_hours}h</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
```

Arquivo `frontend/src/features/commercial/components/Budget/DataStep.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppInputText, AppDatePicker, FormField, FormSection } from '@shared/ui'
import type { QuoteFormFields } from '../../hooks/useQuoteForm'
import { parseUfInput } from '../../lib/uf'

/** Passo 2 do wizard: alunos, valor UF, ordem de compra e datas previstas. */
export function DataStep({
  form, fieldErrors, onChange,
}: {
  form: QuoteFormFields
  fieldErrors?: Record<string, string[]> | null
  onChange: <K extends keyof QuoteFormFields>(k: K, v: QuoteFormFields[K]) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <FormSection title={t('quote.stepData')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('quote.students')} error={fieldErrors?.student_count?.[0]}>
          <AppInputText
            value={String(form.student_count)}
            onChange={(e) => onChange('student_count', Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="w-full"
          />
        </FormField>

        {/* value_uf NUNCA vira Number: aceita vírgula OU ponto na digitação
            e normaliza para ponto — troca de caractere, não aritmética.
            O estado é canônico (ponto), mas a EXIBIÇÃO é sempre es-CL
            (vírgula): "1.250" é ambíguo (mil duzentos e cinquenta, ou
            1,25?) e nenhuma heurística resolve isso sem errar outro caso.
            Mostrando de volta "1,250", o usuário VÊ que o valor virou
            decimal — o caso ambíguo falha à vista, não em silêncio. */}
        <FormField label={t('quote.valueUf')} error={fieldErrors?.value_uf?.[0]}>
          <AppInputText
            value={form.value_uf.replace('.', ',')}
            onChange={(e) => onChange('value_uf', parseUfInput(e.target.value))}
            className="w-full"
          />
        </FormField>
      </div>

      <FormField label={t('quote.purchaseOrder')} error={fieldErrors?.purchase_order?.[0]}>
        <AppInputText
          value={form.purchase_order ?? ''}
          onChange={(e) => onChange('purchase_order', e.target.value || null)}
          className="w-full"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('quote.plannedStart')} error={fieldErrors?.planned_start_date?.[0]}>
          <AppDatePicker
            value={form.planned_start_date ?? null}
            onChange={(v) => onChange('planned_start_date', v)}
          />
        </FormField>
        <FormField label={t('quote.plannedEnd')} error={fieldErrors?.planned_end_date?.[0]}>
          <AppDatePicker
            value={form.planned_end_date ?? null}
            onChange={(v) => onChange('planned_end_date', v)}
          />
        </FormField>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: `QuoteWizard` fica com o passo, o footer e os erros**

O ternário `{step === 1 ? (<section…>) : (<section…>)}` de
`frontend/src/features/commercial/components/Budget/QuoteWizard.tsx` vira:

```tsx
      {step === 1 ? (
        <CourseStep
          list={list}
          search={search}
          onSearch={setSearch}
          selectedId={form.course_id}
          onSelect={(id) => set('course_id', id)}
        />
      ) : (
        <DataStep form={form} fieldErrors={fieldErrors} onChange={set} />
      )}
```

Imports: entram `CourseStep` e `DataStep`; saem `AppInputText`, `AppRadioButton`, `AppDatePicker`,
`FormField`, `FormSection` e `parseUfInput` (ficam `AppDialog`, `AppButton`, `FormErrorSummary`,
`FormErrorBanner`). O bloco de erro fora do passo (`fieldErrors?.course_id?.[0]`) **fica onde
está**, com o comentário — ele existe justamente por aparecer no passo 2.

- [ ] **Step 5: Criar `BudgetDocumentsCard`**

Arquivo `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import {
  AppCard, AppCardHeader, AppDropdown, AppFileUpload, FormErrorBanner,
  type FileUploadHandlerEvent,
} from '@shared/ui'
import type { FileData } from '@shared/types/generated'
import type { BudgetFileType } from '../../api/useCommercialFiles'
import { FileList } from './FileList'

/** Card de documentos do orçamento: tipo, upload, erros e lista. Toda a
 * orquestração continua no `useBudgetDetail` — este componente só consome. */
export function BudgetDocumentsCard({
  files, fileType, onFileTypeChange, uploadPending,
  onUpload, onSizeReject, onRemove, fileError, fileSizeError,
}: {
  files: FileData[]
  fileType: BudgetFileType
  onFileTypeChange: (type: BudgetFileType) => void
  uploadPending: boolean
  onUpload: (e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
  onRemove: (fileId: number) => void
  fileError: string | null
  fileSizeError: string | null
}) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader
        title={t('budget.documents')}
        count={files.length}
        actions={
          <>
            <div className="w-44">
              <AppDropdown
                value={fileType}
                options={[
                  { label: t('budget.fileTypeInvoice'), value: 'invoice' },
                  { label: t('budget.fileTypeReceipt'), value: 'receipt' },
                ]}
                onChange={(e) => onFileTypeChange(e.value as BudgetFileType)}
              />
            </div>
            <AppFileUpload
              chooseOptions={{ icon: 'pi pi-upload' }}
              chooseLabel={t('budget.uploadDocument')}
              disabled={uploadPending}
              onSizeReject={onSizeReject}
              uploadHandler={onUpload}
            />
          </>
        }
      />
      <div className="mx-4 mt-4 empty:m-0">
        <FormErrorBanner message={fileError} />
        {fileSizeError && <FormErrorBanner message={fileSizeError} />}
      </div>
      <FileList files={files} onRemove={onRemove} />
    </AppCard>
  )
}
```

- [ ] **Step 6: Adotar no `BudgetDetailPage`**

O `<AppCard>` de documentos (hoje linhas 104–135) vira:

```tsx
        <BudgetDocumentsCard
          files={budget.files ?? []}
          fileType={d.fileType}
          onFileTypeChange={d.setFileType}
          uploadPending={d.uploadPending}
          onUpload={d.handleUpload}
          onSizeReject={d.onFileSizeReject}
          onRemove={(fileId) => d.removeFile(fileId)}
          fileError={d.fileError}
          fileSizeError={d.fileSizeError}
        />
```

Imports: entra `BudgetDocumentsCard`; saem `AppDropdown`, `AppFileUpload`, `FormErrorBanner`,
`FileList` e `BudgetFileType` — **confirme antes de apagar** que nenhum deles é usado em outro
ponto do arquivo (o `AppCard`/`AppCardHeader` continuam, por causa do card de cotações e do
`StatCard`).

- [ ] **Step 7: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes. O `pnpm build` roda `tsc -b` antes do bundle — import não usado que sobrou aparece
aqui.

```bash
cd /home/jvbat/projetos/lotus && git diff --stat main...HEAD -- frontend/src/shared/
```

Esperado: vazio — nada subiu para `shared/` neste bloco.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/commercial/components/Budget/
git commit -m "refactor(frontend): QuoteRow, CourseStep/DataStep e BudgetDocumentsCard

Os blocos coesos presos em .map e em terniario viram subcomponentes locais de
commercial. Markup movido literal: nenhuma condicional muda de forma, nenhuma
key muda de criterio."
```

---

## CHECKPOINT CP-1 — prova visual de `commercial` (PARE aqui)

O executor **não** segue para a Task 7 sem aprovação do João. Sem ferramenta de browser na sessão,
a prova é comparação ao vivo, sem baseline capturada (D8). Peça ao João que confira, com
`docker compose up -d` e `pnpm dev` rodando:

- [ ] **Presupuestos (lista):** busca por código; busca por nome de cliente; filtro de estado;
  contagem no rodapé; empty state de busca (com "Limpar busca") vs. empty state de lista vazia;
  com a API de clientes derrubada, a tabela mostra erro com Reintentar — **não** `—` silencioso na
  coluna Cliente.
- [ ] **Diálogo de orçamento:** create com dropdown de cliente populado; edit com cliente travado e
  só `payment_terms` editável.
- [ ] **Detalhe do orçamento:** cotações com nome do curso, estado, valor UF; aprovar, rejeitar,
  editar, excluir; upload de documento por cotação com o botão desabilitado **só na linha em voo**;
  arquivo acima de 10 MB mostra o erro de tamanho; card de documentos do orçamento (tipo, upload,
  remoção, erro).
- [ ] **Diálogo de cliente:** create, view e edit; endereço; contatos — adicionar, remover, marcar
  principal, e com um único contato a lixeira desabilitada com o `title` de aviso; foto.

Aprovado → Task 7. Reprovado → corrigir antes de seguir, e refazer o CP-1 sobre o estado corrigido.

---

### Task 7: `useCourseRedatores` — `CourseDialog` sai da catraca

**Files:**
- Create: `frontend/src/features/catalog/hooks/useCourseRedatores.ts`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx`
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: `redatoresApi` (`@shared/api/redatoresApi`).
- Produces: `useCourseRedatores(enabledIds: number[]): { isLoading: boolean; isError: boolean;
  errorDetail: string | null | undefined; refetch: () => void; allRedatores: RedatorData[];
  enabledRedatores: RedatorData[] }`.

- [ ] **Step 1: Criar o hook**

Arquivo `frontend/src/features/catalog/hooks/useCourseRedatores.ts`:

```ts
import { redatoresApi } from '@shared/api/redatoresApi'

/** Redatores da seção do diálogo de curso. Molde: `useRedatorCourses` de
 * `identity` — o hook devolve o derivado e os estados, nunca o objeto de query.
 *
 * `isError` fica exposto SEPARADO do `?? []`: um 403 não pode se disfarçar de
 * "curso sem redatores habilitados" num curso que tem três (D11 do bloco de
 * cards). Os três estados da tela dependem disso. */
export function useCourseRedatores(enabledIds: number[]) {
  const redatores = redatoresApi.useList()
  const allRedatores = redatores.data ?? []

  return {
    isLoading: redatores.isLoading,
    isError: redatores.isError,
    errorDetail: redatores.error?.detail,
    refetch: () => {
      void redatores.refetch()
    },
    allRedatores,
    // Leitura (view/edit): só os já habilitados, derivados da lista viva.
    enabledRedatores: allRedatores.filter((r) => enabledIds.includes(r.id as number)),
  }
}
```

- [ ] **Step 2: Adotar no `CourseDialog`**

Em `frontend/src/features/catalog/components/Course/CourseDialog.tsx`:

```diff
-import { redatoresApi } from '@shared/api/redatoresApi'
 import { usePermissions } from '@shared/hooks'
 import { useCourseForm, type CourseDialogMode } from '../../hooks/useCourseForm'
+import { useCourseRedatores } from '../../hooks/useCourseRedatores'
 import { RedatorCard } from './RedatorCard'
```

```diff
-  const redatores = redatoresApi.useList()
+  const redatores = useCourseRedatores(form.redator_ids)
```

```diff
   const isCreate = mode === 'create'
   const enabledIds = form.redator_ids
-  // Leitura (view/edit): só os redatores já habilitados, derivados da lista viva.
-  const enabledRedatores = (redatores.data ?? []).filter((r) => enabledIds.includes(r.id as number))
+  const enabledRedatores = redatores.enabledRedatores
```

No JSX, os três estados:

```diff
           <AppErrorState
             title={t('common.loadError')}
-            detail={redatores.error?.detail ?? t('common.loadErrorHint')}
+            detail={redatores.errorDetail ?? t('common.loadErrorHint')}
             retryLabel={t('common.retry')}
-            onRetry={() => { void redatores.refetch() }}
+            onRetry={redatores.refetch}
           />
```

```diff
-              {(redatores.data ?? []).map((r) => (
+              {redatores.allRedatores.map((r) => (
```

`redatores.isLoading` e `redatores.isError` continuam com o mesmo nome — agora vêm do hook.

- [ ] **Step 3: Tirar o arquivo da catraca**

Em `frontend/eslint.config.js`, apague:

```
      'src/features/catalog/components/Course/CourseDialog.tsx',
```

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: verdes.

```bash
cd /home/jvbat/projetos/lotus && grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/ | wc -l
```

Esperado: `2`.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/catalog/hooks/useCourseRedatores.ts \
        frontend/src/features/catalog/components/Course/CourseDialog.tsx \
        frontend/eslint.config.js
git commit -m "refactor(frontend): redatores do dialogo de curso vao para useCourseRedatores

CourseDialog sai do ignores. isError continua separado do ?? []: os tres estados
da secao (loading, erro com Reintentar, lista) sao a D11 do bloco de cards."
```

---

### Task 8: `useStaffRoleOptions` — `StaffUserDialog` sai da catraca

**Files:**
- Create: `frontend/src/features/identity/hooks/useStaffRoleOptions.ts`
- Modify: `frontend/src/features/identity/components/Admin/StaffUserDialog.tsx`
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: `rolesApi` (`@shared/api/rolesApi`).
- Produces: `useStaffRoleOptions(): { roleOptions: { label: string; value: string }[] }`.

- [ ] **Step 1: Criar o hook**

Arquivo `frontend/src/features/identity/hooks/useStaffRoleOptions.ts`:

```ts
import { rolesApi } from '@shared/api/rolesApi'

/** Roles atribuíveis a um usuário de staff: todas menos `redator`, que tem tela
 * própria (RN-01). Sem estados de erro expostos: o dropdown vazio em falha de
 * GET é o comportamento de hoje, e mudá-lo sairia do "comportamento idêntico"
 * deste bloco. */
export function useStaffRoleOptions() {
  const roles = rolesApi.useList()

  return {
    roleOptions: (roles.data ?? [])
      .filter((r) => r.name !== 'redator')
      .map((r) => ({ label: r.name, value: r.name })),
  }
}
```

- [ ] **Step 2: Adotar no `StaffUserDialog`**

```diff
-import { rolesApi } from '@shared/api/rolesApi'
 import { usersApi } from '@shared/api/usersApi'
 import { useEntityPhoto } from '@shared/hooks'
 import { useStaffUserForm } from '../../hooks/useStaffUserForm'
+import { useStaffRoleOptions } from '../../hooks/useStaffRoleOptions'
```

```diff
-  const roles = rolesApi.useList()
-
-  // Roles atribuíveis: todas menos 'redator' (RN-01: redator tem tela própria).
-  const roleOptions = (roles.data ?? [])
-    .filter((r) => r.name !== 'redator')
-    .map((r) => ({ label: r.name, value: r.name }))
+  const { roleOptions } = useStaffRoleOptions()
```

O `<AppDropdown ... options={roleOptions} />` não muda.

- [ ] **Step 3: Tirar o arquivo da catraca**

Em `frontend/eslint.config.js`, apague:

```
      'src/features/identity/components/Admin/StaffUserDialog.tsx',
```

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: verdes.

```bash
cd /home/jvbat/projetos/lotus && grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/ | wc -l
```

Esperado: `1`.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity/hooks/useStaffRoleOptions.ts \
        frontend/src/features/identity/components/Admin/StaffUserDialog.tsx \
        frontend/eslint.config.js
git commit -m "refactor(frontend): roles do dialogo de staff vao para useStaffRoleOptions

StaffUserDialog sai do ignores. O filtro de 'redator' (RN-01) viaja junto com a
query, que e onde ele sempre pertenceu."
```

---

### Task 9: `useStudentClients` — `StudentDialog` sai da catraca (o último)

**Files:**
- Create: `frontend/src/features/identity/hooks/useStudentClients.ts`
- Modify: `frontend/src/features/identity/components/Student/StudentDialog.tsx`
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: `clientsApi` (`@shared/api/clientsApi`), `DialogMode` (`@shared/lib`).
- Produces: `useStudentClients(mode: DialogMode): { options: { label: string; value: number |
  undefined }[]; unusable: boolean; isError: boolean; errorDetail: string | null | undefined;
  showEmptyHint: boolean; refetch: () => void }`.

- [ ] **Step 1: Criar o hook**

Arquivo `frontend/src/features/identity/hooks/useStudentClients.ts`:

```ts
import { clientsApi } from '@shared/api/clientsApi'
import type { DialogMode } from '@shared/lib'

/** Clientes do dropdown de empresa do aluno.
 *
 * Só busca no create: view/edit mostram `current_client_name` (já vem no
 * StudentData), sem chamada extra. O create em si segue exigindo só
 * `identity.user.create` (D8/StudentController) — quem tiver a permissão mas não
 * conseguir listar clientes (`commercial.client.view`) vê o motivo na tela, em
 * vez de o botão sumir ou o dropdown ficar vazio sem explicação. */
export function useStudentClients(mode: DialogMode) {
  const isCreate = mode === 'create'
  const clients = clientsApi.useList({ enabled: isCreate })

  return {
    options: (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id })),
    /** Bloqueia só quando NÃO há lista utilizável (ainda carregando, falhou sem
     * cache prévio, ou a lista veio vazia — `[]` é truthy, então checar só
     * `!clients.data` deixaria passar cliente nenhum pra escolher). Um refetch
     * em background que falha com `clients.data` já populado (retry manual,
     * refoco de aba) não deve travar um form que ainda tem opções válidas. */
    unusable: isCreate && !clients.data?.length,
    isError: clients.isError,
    errorDetail: clients.error?.detail,
    /** Lista vazia de verdade — nem erro, nem carregando. Tem mensagem própria,
     * distinta da de falha. */
    showEmptyHint: !clients.isError && clients.isSuccess && clients.data.length === 0,
    refetch: () => {
      void clients.refetch()
    },
  }
}
```

- [ ] **Step 2: Adotar no `StudentDialog`**

```diff
-import { clientsApi } from '@shared/api/clientsApi'
 import { studentsApi } from '@shared/api/studentsApi'
 import { useEntityPhoto } from '@shared/hooks'
 import { useStudentDetail } from '../../api/useStudentDetail'
 import { useStudentForm } from '../../hooks/useStudentForm'
+import { useStudentClients } from '../../hooks/useStudentClients'
```

Todo o bloco das linhas 37–48 (comentários incluídos) vira:

```tsx
  const clients = useStudentClients(mode)
  const clientsUnusable = clients.unusable
```

No JSX do dropdown de empresa:

```diff
                 <AppDropdown
                   value={form.client_id}
                   disabled={clientsUnusable}
-                  options={(clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id }))}
+                  options={clients.options}
                   onChange={(e) => set('client_id', e.value as number)}
                   className="w-full"
                 />
```

```diff
-                    <span>{clients.error?.detail ?? t('common.loadErrorHint')}</span>
-                    <AppButton label={t('common.retry')} text onClick={() => void clients.refetch()} />
+                    <span>{clients.errorDetail ?? t('common.loadErrorHint')}</span>
+                    <AppButton label={t('common.retry')} text onClick={clients.refetch} />
```

```diff
-                {!clients.isError && clients.isSuccess && clients.data.length === 0 && (
+                {clients.showEmptyHint && (
                   <p className="mt-1 flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                     <span>{t('student.noClientsAvailable')}</span>
-                    <AppButton label={t('common.retry')} text onClick={() => void clients.refetch()} />
+                    <AppButton label={t('common.retry')} text onClick={clients.refetch} />
                   </p>
                 )}
```

`{clients.isError && (` continua igual.

- [ ] **Step 3: Tirar o último arquivo da catraca**

Em `frontend/eslint.config.js`, apague:

```
      'src/features/identity/components/Student/StudentDialog.tsx',
```

O array `ignores` fica vazio (`ignores: []`) — o bloco inteiro sai na Task 10, para o commit que
zera a lista ser distinto do commit que remove o mecanismo.

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: verdes.

```bash
cd /home/jvbat/projetos/lotus && grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/
```

Esperado: **sem saída**. Placar zerado.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity/hooks/useStudentClients.ts \
        frontend/src/features/identity/components/Student/StudentDialog.tsx \
        frontend/eslint.config.js
git commit -m "refactor(frontend): clientes do dialogo de aluno vao para useStudentClients

Ultimo arquivo da catraca. O hook preserva o enabled condicional (so create
busca), o unusable que checa .length (nao !data) e a distincao entre erro de GET
e lista vazia — cada um tem sua mensagem e seu Reintentar."
```

---

## CHECKPOINT CP-2 — prova visual de `catalog` e `identity` (PARE aqui)

O executor não segue para a Task 10 sem aprovação do João:

- [ ] **Diálogo de curso:** os 3 estados da seção de redatores — carregando (skeletons), erro com
  Reintentar (derrube a API ou revogue `identity.user.view`), lista; create com cards selecionáveis
  alternando habilitação; view/edit somente leitura com o botão-olho levando a `/personas?redator=`.
- [ ] **Diálogo de admin:** dropdown de rol populado e **sem** `redator` na lista.
- [ ] **Diálogo de aluno:** create com dropdown de clientes; erro de GET de clientes mostrando
  detalhe + Reintentar, com o submit bloqueado; lista de clientes vazia com a mensagem própria +
  Reintentar; view e edit **sem** chamada de clientes, mostrando `current_client_name` e o aviso de
  vínculo travado.

Aprovado → Task 10.

---

### Task 10: O mecanismo perde as exceções

**Files:**
- Modify: `frontend/eslint.config.js`
- Modify: `.claude/rules/frontend-fsliced.md`

- [ ] **Step 1: Remover o bloco `ignores` e o comentário da catraca**

Em `frontend/eslint.config.js`, o bloco da regra passa a ser (só `files` + `rules`; o comentário da
lição 14, acima do bloco, **fica**):

```js
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // `coursesApi.useList()`, `rolesApi.useList()`, e qualquer `xxxApi.useAlgo()`.
          selector: "CallExpression[callee.object.name=/Api$/][callee.property.name=/^use[A-Z]/]",
          message:
            'Query de recurso não vive em componente de feature: mova para um hook em features/<x>/hooks/ e consuma o resultado derivado (frontend-fsliced.md).',
        },
        {
          // `useQuery`/`useMutation` diretos. O `$` é o que impede casar
          // `useMutationErrors`, que é consumo de erro e pode ficar no componente.
          selector:
            "CallExpression[callee.name=/^use(Query|Mutation|InfiniteQuery|SuspenseQuery)$/]",
          message:
            'TanStack Query direto não vive em componente de feature: mova para features/<x>/api/ ou hooks/ (frontend-fsliced.md).',
        },
      ],
    },
  },
```

Sai junto o comentário `// Débito conhecido e enumerado (item do backlog). É catraca: ...` — ele
descrevia a lista, e não há mais lista.

- [ ] **Step 2: Atualizar a rule**

Em `.claude/rules/frontend-fsliced.md`, troque a frase final do bullet "Componente de feature =
declarativo":

```diff
-  A lista de `ignores` da regra é **catraca de débito**: enumera os componentes legados, só encolhe,
-  e não recebe arquivo novo — componente novo que precisa de query ganha um hook.
+  A regra nasceu com uma **catraca**: 7 componentes legados em `ignores`, lista que só encolhia.
+  **Zerada em 2026-08-03** — o bloco `ignores` não existe mais e a regra vale sem exceção. Não
+  reintroduza o campo para calar um arquivo: componente que precisa de query ganha um hook em
+  `features/<x>/hooks/`.
```

- [ ] **Step 3: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: verdes — com a regra valendo para os 7 arquivos sem exceção nenhuma.

```bash
cd /home/jvbat/projetos/lotus && grep -n "ignores" frontend/eslint.config.js
```

Esperado: **uma** linha, a do `globalIgnores(['dist', 'src/shared/types/generated.ts'])`.

- [ ] **Step 4: Provar que a regra ainda morde (lição 10)**

A regra tem de ser vista reprovando, não só passando. Introduza a violação de propósito:

```bash
cd /home/jvbat/projetos/lotus
printf "\nconst _probe = clientsApi.useList()\n" >> frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
cd frontend && pnpm lint 2>&1 | grep -c "Query de recurso não vive em componente de feature"; cd ..
git checkout frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
git status --porcelain
```

Esperado: o `grep -c` devolve **≥ 1** (o lint reprova, e reprova por ESTA regra — vai reclamar
também de `_probe` não usado e do símbolo sem import, que não são a prova; a mensagem da regra é).
O `git checkout` devolve o arquivo e o `git status --porcelain` sai vazio.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/eslint.config.js .claude/rules/frontend-fsliced.md
git commit -m "chore(frontend): catraca zerada, bloco de ignores removido

A regra de query-em-componente passa a valer sem excecao. Vista reprovando de
novo depois da remocao (licao 10), com uma violacao introduzida de proposito e
revertida. Rule atualizada: nao reintroduzir ignores para calar arquivo."
```

---

### Task 11: Gate do bloco

**Files:** nenhum arquivo modificado — só verificação. Se algum passo reprovar, corrija na task
correspondente e refaça o gate inteiro.

- [ ] **Step 1: Frontend verde**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: ambos verdes.

- [ ] **Step 2: Placar da catraca em zero, e sem `ignores` sobrando**

```bash
cd /home/jvbat/projetos/lotus
grep -rEn "use(Query|Mutation)\b|Api\.use" frontend/src/features/*/components/
grep -n "ignores" frontend/eslint.config.js
```

Esperado: primeiro grep sem saída; segundo com uma linha só (o `globalIgnores`).

- [ ] **Step 3: Bloco 100% frontend, sem i18n nova, sem tipo gerado tocado**

```bash
git diff --name-only main...HEAD -- backend/
git diff --name-only main...HEAD -- frontend/src/shared/config/locales/
git diff --name-only main...HEAD -- frontend/src/shared/types/generated.ts
git diff --stat main...HEAD -- frontend/src/shared/
```

Esperado: as quatro saídas vazias.

- [ ] **Step 4: Nenhum hook órfão**

```bash
for h in useCommercialClients useQuoteCourseSearch useQuotesListCourses useQuoteFiles \
         useCourseRedatores useStaffRoleOptions useStudentClients; do
  echo "== $h: $(grep -rl "$h" frontend/src --include=*.tsx | wc -l) consumidor(es)"
done
```

Esperado: `useCommercialClients` com 2; os outros 6 com 1. Zero é órfão e reprova.

- [ ] **Step 5: Suíte backend como regressão**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d && docker compose exec -T app php artisan test
```

Esperado: **372 passed (1360 assertions)** — igual à baseline do bloco anterior. O bloco não tocou
`backend/`; qualquer divergência aqui é ambiente, não código, e tem de ser explicada antes de
fechar.

- [ ] **Step 6: Pint**

Não se aplica — zero arquivo de `backend/` no diff (confirmado no Step 3). Registre "n/a" no
relatório em vez de rodar.

- [ ] **Step 7: Relatório do gate**

Escreva para o João, em texto, o resultado de cada step acima com o número/saída real (não "ok"):
contagem do grep, contagem de testes, contagem de consumidores por hook. Reafirme que CP-1 e CP-2
foram aprovados e **em que estado do código** — se algum componente mudou depois de um checkpoint,
esse checkpoint precisa ser refeito antes do fechamento (foi o que aconteceu no bloco do redator).

---

## Handoff de execução

**`executor: claude`**

Não delegar ao Codex. Motivos, nesta ordem:

1. O DoD é comportamento idêntico **provado na tela** (CP-1/CP-2), não verificação executável — o
   frontend não tem test runner, então não existe critério que uma sessão delegada possa fechar
   sozinha.
2. Nove das onze tasks decidem, a cada extração, o que **não** mudar: `?? []` que fica, `isError`
   que não se expõe, condicional que não vira guarda. Isso é julgamento contra a spec (D3) e contra
   decisões antigas registradas em comentário, não transformação mecânica.
3. O bloco toca `frontend/eslint.config.js` e `.claude/rules/`, que valem para o repositório inteiro.

`paths_autorizados`: não se aplica (sem task delegada).
