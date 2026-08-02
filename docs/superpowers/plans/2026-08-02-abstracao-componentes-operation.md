# Abstração de componentes de `operation` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mover a orquestração que sobrou em seis componentes de `features/operation` para hooks da
feature e guardas sequenciais, sem alterar uma vírgula do que a tela renderiza.

**Architecture:** dois hooks novos (`useImportStudentsFlow`, `useTurmaManualOpener`), um hook
existente que absorve a query do curso (`useTurmaConfigForm`), um subcomponente local de render
(`PickerBody`), um handler que sai do JSX (`DocumentTypeCard`) e um parâmetro que vira opcional em
`shared/hooks/useTableFilter.ts` para o `EnrollmentTable` parar de reimplementá-lo.

**Tech Stack:** React 19 + TS, Vite, TanStack Query, PrimeReact via `shared/ui`, Tailwind v4 (layout).

**Spec:** [`docs/superpowers/specs/2026-08-02-abstracao-componentes-operation-design.md`](../specs/2026-08-02-abstracao-componentes-operation-design.md) (D1–D11)

## Global Constraints

- **Comportamento idêntico, sem exceção declarada** (spec §2). Se um passo mudar o que a tela
  renderiza, o passo está errado — não é "melhoria", é bug (peso legal).
- **Zero arquivo de `backend/`** (D1). Zero chave i18n nova, zero texto alterado (D10).
- **Não existe test runner no frontend** (`CLAUDE.md` §6: "sem test runner ainda"). O ciclo TDD
  clássico não se aplica aqui: cada task fecha com `pnpm build` + `pnpm lint` + um grep específico
  que prova a mudança estrutural; a prova **comportamental** é a conferência do João nos
  checkpoints das Tasks 5 e 9. Build verde não é aceite (`CLAUDE.md` §5.8).
- **Comandos do frontend rodam de `frontend/`**, nativo no WSL: `pnpm build` (tsc -b && vite build),
  `pnpm lint`. Backend só como regressão, no container.
- **Lei §5.6:** feature não importa `primereact` direto nem outra feature, nem para tipo.
- **`shared/` nunca importa de `features/`** (ADR-05).
- **Branch:** `refactor/abstracao-componentes-operation`, já criada a partir do `main`, no main tree,
  sem worktree (D2). A spec e o `state.md` já estão commitados nela (`8b3faf9`).
- **Fora de escopo, não tocar:** cor Tailwind hardcoded nos 4 arquivos de `Enrollment`/`Document`;
  as 5 asserções `turma.id!`; a formatação de `TurmaDetailPage.tsx`; busca na aba Alumnos.

---

### Task 1: `useTableFilter` aceita tabela sem busca

Fundação da Task 2. Isolada em task própria porque toca `shared/` e serve 7 telas de 3 features —
um revisor pode aprovar esta e rejeitar a adoção, ou o contrário.

**Files:**
- Modify: `frontend/src/shared/hooks/useTableFilter.ts:39-56`

**Interfaces:**
- Consumes: nada.
- Produces: `useTableFilter<T>(items: T[], searchable?: (item: T) => (string | null | undefined)[], where?: (item: T) => boolean): TableFilter<T>` — o 2º parâmetro passa a ser opcional; `TableFilter<T>` não muda.

- [ ] **Step 1: Registrar a baseline dos 7 consumidores atuais**

Run:
```bash
cd frontend && grep -rl "useTableFilter" src/features/ | sort
```
Expected — exatamente estes 7 arquivos (o `EnrollmentTable` **não** está na lista; ele só cita o
hook num comentário):
```
src/features/catalog/components/Course/CoursesTable.tsx
src/features/commercial/components/Budget/BudgetsTable.tsx
src/features/commercial/components/Client/ClientsTable.tsx
src/features/identity/components/Admin/UsersTable.tsx
src/features/identity/components/Redator/RedatoresTable.tsx
src/features/identity/components/Student/StudentsTable.tsx
src/features/operation/components/Turma/TurmasTable.tsx
```

- [ ] **Step 2: Tornar `searchable` opcional**

Em `frontend/src/shared/hooks/useTableFilter.ts`, trocar a assinatura e o cálculo de `rows`:

```ts
export function useTableFilter<T>(
  items: T[],
  searchable?: (item: T) => (string | null | undefined)[],
  where?: (item: T) => boolean,
): TableFilter<T> {
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const scoped = where ? items.filter(where) : items
  const rows =
    term === '' || !searchable
      ? scoped
      : scoped.filter((item) =>
          searchable(item).some((value) => (value ?? '').toLowerCase().includes(term)),
        )
```

O resto do arquivo (clamp, `onFilterChange`, retorno) fica **intacto**.

- [ ] **Step 3: Documentar o caso novo no doc-comment**

No bloco `/** … */` acima da função, trocar a frase que descreve `searchable` por:

```
 * `searchable` devolve os campos que a busca varre — `null`/`undefined` são
 * ignorados. É OPCIONAL: uma tabela em card pode não ter busca (a aba Alumnos
 * não tem, por decisão do protótipo) e ainda assim precisa do estado de página
 * e do clamp — sem isso o consumidor reimplementa o bloco, que é a duplicação
 * que este hook existe para matar. `where` é o filtro próprio da tela (estado,
 * tipo) e roda ANTES da busca; saber se ele está ativo continua sendo da tela,
 * não do hook.
```

- [ ] **Step 4: Provar que nenhum consumidor atual mudou**

Run:
```bash
cd frontend && pnpm build && pnpm lint && cd .. && git diff --stat -- frontend/src/features/
```
Expected: build e lint verdes; o `git diff --stat` de `features/` **vazio** (nenhum dos 7 chamadores
precisou mudar — é o que prova a retrocompatibilidade).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/hooks/useTableFilter.ts
git commit -m "refactor(shared): useTableFilter aceita tabela sem busca

searchable vira opcional: quando ausente, rows === scoped. Os 7
consumidores atuais nao mudam uma linha. Abre caminho para o
EnrollmentTable parar de reimplementar paginacao e clamp (D4).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `EnrollmentTable` adota `useTableFilter` (C-2)

**Files:**
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx:1-3,25-44`

**Interfaces:**
- Consumes: `useTableFilter(items)` da Task 1 — devolve `{ rows, first, onPage, … }`.
- Produces: nada para tasks seguintes. As props do componente (`Props`) **não mudam**.

- [ ] **Step 1: Trocar o estado local pelo hook**

Em `EnrollmentTable.tsx`, o import passa a incluir o hook:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, ConfirmDialog } from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { EnrollmentData } from '@shared/types/generated'
import { enrollmentStatusLabelKey, enrollmentStatusSeverity } from '@shared/lib'
```

E o corpo do componente, até o `return`, fica:

```tsx
  const { t } = useTranslation()
  const [pending, setPending] = useState<EnrollmentData | null>(null)
  // Aba sem busca (decisão do protótipo): o hook entra pelo estado de página e
  // pelo clamp, que estavam copiados aqui linha a linha.
  const table = useTableFilter(enrollments)
```

O `useState<EnrollmentData | null>(pending)` **fica** — é o alvo do `ConfirmDialog`, não paginação.
As 8 linhas do `useState(0)` + comentário do clamp + `if (first >= enrollments.length …)` somem.

- [ ] **Step 2: Ligar a tabela ao hook**

No `<AppDataTable>`, trocar as quatro props de paginação/contagem:

```tsx
      <AppDataTable
        value={table.rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        first={table.first}
        onPage={table.onPage}
        footerCount={t('operation.enrollment.footerCount', { count: table.rows.length })}
```

Sem `searchable`, `table.rows` é `enrollments` — a contagem e a ordem não mudam. O resto do JSX
(colunas, `emptyMessage`, `ConfirmDialog`) fica **intacto**.

- [ ] **Step 3: Provar que o estado de paginação sumiu do componente**

Run:
```bash
cd frontend && grep -n "useState(0)\|setFirst" src/features/operation/components/Enrollment/EnrollmentTable.tsx
```
Expected: **nenhuma saída** (exit 1).

- [ ] **Step 4: Build e lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx
git commit -m "refactor(operation): EnrollmentTable usa useTableFilter (C-2)

Remove o useState de first, o clamp e o onPage proprios, copiados
literalmente do hook (comentario incluido). Comportamento identico:
sem searchable, rows === enrollments.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: a query do curso desce para `useTurmaConfigForm` (C-1)

**Files:**
- Modify: `frontend/src/features/operation/hooks/useTurmaConfigForm.ts:1-4,31-68`
- Modify: `frontend/src/features/operation/components/Turma/TurmaConfigCard.tsx:1-6,19-23,66-70`

**Interfaces:**
- Consumes: `coursesApi.useList()` de `@shared/api/coursesApi` (`CourseData[]`; `workload_hours: number`, não-nulo em `generated.ts:57`).
- Produces: `useTurmaConfigForm(...)` passa a devolver, além de `{ form, set, readOnly, submit, pending, fieldErrors, generalError }`, o campo **`workloadHours: number | null`**.

- [ ] **Step 1: Mover a query para o hook**

Em `useTurmaConfigForm.ts`, acrescentar o import:

```ts
import { coursesApi } from '@shared/api/coursesApi'
```

e, dentro da função (logo depois do `useEntityForm`), a query e a derivação:

```ts
  // Carga horária contratada é leitura de apoio do form (o campo é `disabled`),
  // não entra no payload. A query dispara nos 3 modos, como sempre disparou.
  const courses = coursesApi.useList()
  const course = turma?.course_id != null ? courses.data?.find((c) => c.id === turma.course_id) : undefined
```

- [ ] **Step 2: Expor `workloadHours` no retorno**

No `return` do hook, acrescentar a linha:

```ts
    workloadHours: course?.workload_hours ?? null,
```

`workload_hours` é `number` não-nulo no DTO, então `?? null` só cai quando o curso não resolve — o
mesmo caso em que a tela hoje mostra `—`.

- [ ] **Step 3: Enxugar o componente**

Em `TurmaConfigCard.tsx`, **remover** o import `import { coursesApi } from '@shared/api/coursesApi'`
e as duas linhas de query/derivação, deixando o topo do componente assim:

```tsx
export function TurmaConfigCard({ mode, turma = null, quoteId, onSaved, onEdit, onCancel }: Props) {
  const { t } = useTranslation()
  const f = useTurmaConfigForm({ mode, turma, quoteId, onSaved })

  const modalityOptions = [
    { label: t('operation.modality.presencial'), value: 'presencial' },
    { label: t('operation.modality.online'), value: 'online' },
  ]
```

E o campo de carga horária passa a ler o hook:

```tsx
        {mode !== 'create' && (
          <FormField label={t('operation.config.workload')}>
            <AppInputText
              value={f.workloadHours != null ? t('operation.config.workloadValue', { hours: f.workloadHours }) : '—'}
              disabled
              readOnly
            />
          </FormField>
        )}
```

- [ ] **Step 4: Provar que não sobrou query no componente**

Run:
```bash
cd frontend && grep -rnE "use(Query|Mutation)\b|Api\.useList" src/features/operation/components/
```
Expected: **nenhuma saída** (exit 1). Antes desta task, esse grep devolvia exatamente
`Turma/TurmaConfigCard.tsx:22`.

- [ ] **Step 5: Build e lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: ambos verdes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/operation/hooks/useTurmaConfigForm.ts frontend/src/features/operation/components/Turma/TurmaConfigCard.tsx
git commit -m "refactor(operation): query do curso vai para useTurmaConfigForm (C-1)

coursesApi.useList() e a derivacao do curso saem do componente; o hook
expoe workloadHours. Mesmo achado do Q-4 do bloco anterior
(RedatorCourseSelector/useRedatorCourses).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `useImportStudentsFlow` (C-3)

**Files:**
- Create: `frontend/src/features/operation/hooks/useImportStudentsFlow.ts`
- Modify: `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx:1-35,46-73`

**Interfaces:**
- Consumes: `useImportStudents()` de `../api/useImportStudents`; `useMutationErrors` de `@shared/hooks`; `FileUploadHandlerEvent` de `@shared/ui`.
- Produces: `useImportStudentsFlow(turmaId: number, onHide: () => void)` devolvendo
  `{ result: ImportResultData | null, sizeError: string | null, setSizeError: (m: string | null) => void, upload: (e: FileUploadHandlerEvent) => void, close: () => void, pending: boolean, message: string | null }`.

- [ ] **Step 1: Criar o hook**

Criar `frontend/src/features/operation/hooks/useImportStudentsFlow.ts`:

```ts
import { useState } from 'react'
import type { ImportResultData } from '@shared/types/generated'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import { useImportStudents } from '../api/useImportStudents'

/**
 * Fluxo do diálogo de importação de planilha. Molde: `useEnrollStudentFlow`, o
 * vizinho da mesma pasta — `result`, `sizeError` e a mutation mudam juntos e
 * precisam ser resetados juntos, senão reabrir o diálogo mostra o resumo (ou o
 * erro) de uma importação anterior.
 *
 * `close` é inerte enquanto a mutation está em voo: o diálogo trava ESC/X para
 * o 422/403 ter onde pousar (mesma disciplina dos ConfirmDialog da feature).
 */
export function useImportStudentsFlow(turmaId: number, onHide: () => void) {
  const importMutation = useImportStudents()
  const { message } = useMutationErrors([importMutation.error])
  const [result, setResult] = useState<ImportResultData | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const upload = (e: FileUploadHandlerEvent) => {
    setSizeError(null)
    const file = e.files[0]
    if (!file) return
    importMutation.mutate({ turmaId, file }, { onSuccess: (r) => setResult(r) })
  }

  const close = () => {
    if (importMutation.isPending) return
    setResult(null)
    setSizeError(null)
    importMutation.reset()
    onHide()
  }

  return {
    result,
    sizeError,
    setSizeError,
    upload,
    close,
    pending: importMutation.isPending,
    message,
  }
}
```

- [ ] **Step 2: Reescrever o `ImportDialog` como consumidor**

Substituir o conteúdo de `ImportDialog.tsx` por:

```tsx
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppFileUpload } from '@shared/ui'
import { useImportStudentsFlow } from '../../hooks/useImportStudentsFlow'
import { ImportResultSummary } from './ImportResultSummary'

type Props = {
  turmaId: number
  visible: boolean
  onHide: () => void
}

export function ImportDialog({ turmaId, visible, onHide }: Props) {
  const { t } = useTranslation()
  const f = useImportStudentsFlow(turmaId, onHide)

  return (
    <AppDialog
      visible={visible}
      header={t('operation.enrollment.import.title')}
      onHide={f.close}
      closable={!f.pending}
      closeOnEscape={!f.pending}
      dismissableMask={false}
    >
      <div className="space-y-4">
        {!f.result && (
          <>
            <p className="text-sm text-slate-500">{t('operation.enrollment.import.help')}</p>
            <AppFileUpload
              accept=".xlsx,.csv"
              chooseLabel={t('operation.enrollment.import.choose')}
              onSizeReject={f.setSizeError}
              uploadHandler={f.upload}
              disabled={f.pending}
            />
            {f.pending && (
              <p className="text-sm text-slate-500">{t('operation.enrollment.import.uploading')}</p>
            )}
          </>
        )}

        {f.result && (
          <>
            <ImportResultSummary result={f.result} />
            <div className="flex justify-end">
              <AppButton label={t('operation.enrollment.import.close')} onClick={f.close} />
            </div>
          </>
        )}

        {(f.sizeError || f.message) && (
          <p className="text-sm text-red-600">{f.sizeError || f.message}</p>
        )}
      </div>
    </AppDialog>
  )
}
```

As classes de cor (`text-slate-500`, `text-red-600`) ficam **exatamente como estavam** — trocá-las é
o débito de UI declarado fora de escopo na spec §2.

- [ ] **Step 3: Provar que o componente não orquestra mais**

Run:
```bash
cd frontend && grep -n "useState\|useMutationErrors\|useImportStudents\b" src/features/operation/components/Enrollment/ImportDialog.tsx
```
Expected: **nenhuma saída** (exit 1).

- [ ] **Step 4: Build e lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/hooks/useImportStudentsFlow.ts frontend/src/features/operation/components/Enrollment/ImportDialog.tsx
git commit -m "refactor(operation): extrai useImportStudentsFlow (C-3)

Mutation, result, sizeError e o close que reseta os tres saem do
componente. Molde: useEnrollStudentFlow, o vizinho da mesma pasta.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: CHECKPOINT 1 — prova visual de Configuración + Alumnos (D11)

**Files:** nenhum. Task de verificação com o João; nada é commitado aqui.

**Interfaces:**
- Consumes: Tasks 1–4 aplicadas.
- Produces: aprovação (ou lista de divergências) que libera a Task 6.

- [ ] **Step 1: Subir o ambiente**

Run:
```bash
docker compose up -d && cd frontend && pnpm dev
```
Expected: backend em http://localhost:8080, front em http://localhost:5173.

- [ ] **Step 2: Pedir a conferência ao João, item a item**

Abrir uma turma em `/operacion` e conferir, comparando com o `main` quando houver dúvida:

1. **Configuración** — carga horária no `view`; entrar em `edit` e a carga horária continuar igual;
   turma cujo curso não resolve mostra `—`; salvar funciona e volta para `view`.
2. **Alumnos** — a tabela lista igual; com mais de uma página, ir para a última, remover o último
   aluno e a tabela voltar para a primeira página (não ficar em página vazia); a faixa de rodapé
   conta o mesmo número de antes.
3. **Import** — planilha válida mostra o resumo; arquivo acima do teto mostra o erro de tamanho;
   erro do servidor mostra a mensagem; fechar e reabrir o diálogo **não** traz resultado nem erro da
   tentativa anterior; com upload em voo, ESC e o X não fecham.

- [ ] **Step 3: Registrar o resultado**

Aprovado → seguir para a Task 6. Divergência → **parar**, corrigir a task de origem, e repetir este
checkpoint inteiro (não só o item que falhou).

---

### Task 6: `PickerBody` no `RedatorDesignation` (B-1)

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx:1-93`

**Interfaces:**
- Consumes: `useRedatorPicker(turma)` (inalterado) — `{ eligible, loadingList, loadError, reloadList, designate, remove, pending, error }`.
- Produces: nada exportado. `PickerBody` é local ao arquivo, tipado por `ReturnType<typeof useRedatorPicker>`.

- [ ] **Step 1: Criar o subcomponente com guardas sequenciais**

Em `RedatorDesignation.tsx`, **acima** de `export function RedatorDesignation`, acrescentar:

```tsx
type Picker = ReturnType<typeof useRedatorPicker>

/** Corpo do diálogo do picker. A ordem das guardas é erro > carregando > vazio >
 * lista: invertê-la faria a falha de carga passar por "nenhum redator elegível"
 * (spec D16). Como guardas sequenciais a ordem é o próprio fluxo do código —
 * antes era um ternário de 4 níveis dentro do `return`. */
function PickerBody({ picker, onPick }: { picker: Picker; onPick: (redatorId: number) => void }) {
  const { t } = useTranslation()

  if (picker.loadError)
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={picker.loadError.detail ?? t('common.loadErrorHint')}
        retryLabel={t('common.retry')}
        onRetry={picker.reloadList}
      />
    )

  if (picker.loadingList)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>

  if (picker.eligible.length === 0)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.pickerEmpty')}</p>

  return (
    <ul className="space-y-2">
      {picker.eligible.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border p-3" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-3">
            <AppAvatar name={r.name} />
            <span className="font-medium">{r.name}</span>
          </div>
          <AppButton
            variant="brandIcon"
            label={t('operation.redator.pick')}
            icon="pi pi-check"
            disabled={picker.pending}
            onClick={() => onPick(r.id!)}
          />
        </li>
      ))}
    </ul>
  )
}
```

O markup de cada ramo é **cópia literal** do que estava no ternário — mesmas classes, mesmos estilos
inline, mesmas chaves i18n.

- [ ] **Step 2: Trocar o ternário pelo subcomponente**

No `AppDialog` de `RedatorDesignation`, substituir todo o bloco de ternários (linhas ~55-89) por:

```tsx
      <AppDialog visible={open} header={t('operation.redator.pickerTitle')} onHide={() => setOpen(false)}>
        <PickerBody
          picker={picker}
          onPick={(redatorId) => {
            picker.designate(redatorId)
            setOpen(false)
          }}
        />
      </AppDialog>
```

O `setOpen` continua no componente-pai: fechar o diálogo é estado da tela, não do picker.

- [ ] **Step 3: Provar que o ternário sumiu**

Run:
```bash
cd frontend
grep -n "picker.loadError ?\|picker.loadingList ?\|picker.eligible.length === 0 ?" src/features/operation/components/Turma/RedatorDesignation.tsx
grep -n "function PickerBody" src/features/operation/components/Turma/RedatorDesignation.tsx
```
Expected: o 1º **sem saída** (as três condições agora são `if`, não ramos de ternário); o 2º devolve
uma linha. O único ternário que resta no componente-pai é o `label` do botão designar/trocar, que é
escolha de rótulo e não fluxo de estado.

- [ ] **Step 4: Build e lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/components/Turma/RedatorDesignation.tsx
git commit -m "refactor(operation): PickerBody com guardas sequenciais (B-1)

O ternario de 4 niveis do dialogo do picker vira subcomponente local
com guardas erro > loading > vazio > lista. Mesma licao do Q-2 do bloco
anterior (SlotBody).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `useTurmaManualOpener` (B-2)

**Files:**
- Create: `frontend/src/features/operation/hooks/useTurmaManualOpener.ts`
- Modify: `frontend/src/features/operation/components/Document/ManualButton.tsx:1-65`

**Interfaces:**
- Consumes: `useTurmaManual()` de `../api/useTurmas` (mutation `Blob`); `useMutationErrors`.
- Produces: `useTurmaManualOpener(turmaId: number)` devolvendo `{ open: () => void, pending: boolean, popupBlocked: boolean, message: string | null }`.

- [ ] **Step 1: Criar o hook**

Criar `frontend/src/features/operation/hooks/useTurmaManualOpener.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import { useTurmaManual } from '../api/useTurmas'

/**
 * Abre o manual da turma numa aba nova. O PDF é buscado como blob (a rota exige
 * o cookie de sessão) e o objectURL é revogado no unmount para não vazar.
 *
 * A aba é aberta ANTES da requisição, de propósito: `window.open` fora do gesto
 * do usuário é bloqueado pelo navegador. Se o bloqueio acontecer mesmo assim,
 * `popupBlocked` avisa em vez de o botão só parar de carregar.
 *
 * O `useEffect` daqui é liberação de recurso no unmount — não é sincronização
 * de estado, então não cai na proibição de `useEffect` + `setState` da rule.
 */
export function useTurmaManualOpener(turmaId: number) {
  const manual = useTurmaManual()
  const { message } = useMutationErrors([manual.error])
  const urlRef = useRef<string | null>(null)
  const tabRef = useRef<Window | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      tabRef.current?.close()
    },
    [],
  )

  const open = () => {
    setPopupBlocked(false)
    const tab = window.open('about:blank', '_blank')
    if (!tab) {
      setPopupBlocked(true)
      return
    }

    tab.opener = null
    tabRef.current = tab
    manual.mutate(turmaId, {
      onSuccess: (blob) => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        tab.location.href = urlRef.current
        tabRef.current = null
      },
      onError: () => {
        tab.close()
        tabRef.current = null
      },
    })
  }

  return { open, pending: manual.isPending, popupBlocked, message }
}
```

O corpo de `open` e do `useEffect` é **cópia literal** do componente — nenhuma linha de lógica muda.

- [ ] **Step 2: Reescrever o `ManualButton` como consumidor**

Substituir o conteúdo de `ManualButton.tsx` por:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import { useTurmaManualOpener } from '../../hooks/useTurmaManualOpener'

export function ManualButton({ turmaId }: { turmaId: number }) {
  const { t } = useTranslation()
  const manual = useTurmaManualOpener(turmaId)

  return (
    <div className="flex flex-col items-end gap-1">
      <AppButton
        label={t('operation.documents.manual')}
        icon="pi pi-file-pdf"
        outlined
        loading={manual.pending}
        onClick={manual.open}
      />
      {(manual.popupBlocked || manual.message) && (
        <p className="text-sm text-red-600">
          {manual.popupBlocked ? t('operation.documents.popupBlocked') : manual.message}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Provar que a orquestração saiu do componente**

Run:
```bash
cd frontend && grep -n "useRef\|useEffect\|useState\|window.open" src/features/operation/components/Document/ManualButton.tsx
```
Expected: **nenhuma saída** (exit 1).

- [ ] **Step 4: Build e lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/hooks/useTurmaManualOpener.ts frontend/src/features/operation/components/Document/ManualButton.tsx
git commit -m "refactor(operation): extrai useTurmaManualOpener (B-2)

Mutation do blob, refs de objectURL/aba, cleanup de unmount e o handler
open saem do componente. O ManualButton fica declarativo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: `handleUpload` sai do JSX no `DocumentTypeCard` (B-3)

**Files:**
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx:29-60`

**Interfaces:**
- Consumes: props existentes (`onUpload`, `uploading`, `canSubmit`) — nada muda no contrato.
- Produces: nada.

- [ ] **Step 1: Subir o handler para acima do `return`**

Em `DocumentTypeCard.tsx`, logo depois de `const delivered = files.length > 0`, acrescentar:

```tsx
  // Limpa o filesState/input do Prime JÁ, antes de disparar a mutação
  // (diferente do useBudgetDetail, que limpa só no onSuccess): com
  // filesState não-vazio o input some do DOM e o clique seguinte
  // reenvia o MESMO arquivo em vez de reabrir o seletor — no sucesso
  // (arquivo errado subiu) e na falha (422 rejeitado) igual. `file`
  // já foi capturado no fechamento, então segue válido para
  // `onUpload` mesmo depois do clear resetar o estado do Prime.
  const handleUpload = (e: FileUploadHandlerEvent) => {
    setSizeError(null)
    const file = e.files[0]
    if (!file) return
    e.options.clear()
    onUpload(file)
  }
```

- [ ] **Step 2: Enxugar o `AppFileUpload`**

```tsx
          <AppFileUpload
            accept="application/pdf"
            chooseLabel={t('operation.documents.upload')}
            disabled={uploading}
            onSizeReject={setSizeError}
            uploadHandler={handleUpload}
          />
```

O `useState` de `sizeError` **fica** no componente (D8: estado local de um único campo, não cruza
fronteira — promovê-lo a hook seria o over-engineering que a rule desaconselha).

- [ ] **Step 3: Provar que o JSX não tem mais corpo de função**

Run:
```bash
cd frontend && grep -n "uploadHandler" src/features/operation/components/Document/DocumentTypeCard.tsx
```
Expected: uma única linha, `uploadHandler={handleUpload}`.

- [ ] **Step 4: Build e lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/components/Document/DocumentTypeCard.tsx
git commit -m "refactor(operation): handleUpload sai do JSX (B-3)

O corpo de 13 linhas do uploadHandler sobe para cima do return, com o
comentario que explica o clear() antes da mutacao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: CHECKPOINT 2 — prova visual de Redator + Documentación (D11)

**Files:** nenhum. Task de verificação com o João; nada é commitado aqui.

**Interfaces:**
- Consumes: Tasks 6–8 aplicadas.
- Produces: aprovação que libera o gate da Task 10.

- [ ] **Step 1: Pedir a conferência ao João, item a item**

Na mesma turma, abas *Redator* e *Documentación*:

4. **Redator** — os 4 estados do picker, nesta ordem de precedência: com a API derrubada
   (`docker compose stop nginx`), abrir o picker mostra **erro com Reintentar**, nunca "nenhum
   redator elegível"; religando (`docker compose start nginx`), o Reintentar carrega; turma cujo
   curso não tem redator idôneo mostra o vazio; turma com elegíveis lista, designa e fecha o
   diálogo; remover redator funciona.
5. **Documentación** — upload de PDF sobe, o card vira "entregado" e o seletor volta ao estado
   inicial (clicar de novo **reabre o seletor**, não reenvia o mesmo arquivo); arquivo acima do teto
   mostra o erro de tamanho; remover pede confirmação e funciona; **Manual** abre a aba nova com o
   PDF; com popups bloqueados no navegador, mostra a mensagem em vez de só parar de carregar.

- [ ] **Step 2: Registrar o resultado**

Aprovado → Task 10. Divergência → parar, corrigir a task de origem, repetir este checkpoint inteiro.

---

### Task 10: Gate de bloco e transição de estado

**Files:**
- Modify: `docs/superpowers/state.md`

**Interfaces:**
- Consumes: Tasks 1–9 concluídas e os dois checkpoints aprovados.
- Produces: `workflow_state: ready_for_review`.

- [ ] **Step 1: Provar os limites do bloco (D1, D10, D4)**

Run:
```bash
cd /home/jvbat/projetos/lotus
git diff --name-only main...HEAD -- backend/
git diff --name-only main...HEAD -- frontend/src/shared/config/locales/
git diff --stat main...HEAD -- frontend/src/features/catalog/ frontend/src/features/commercial/ frontend/src/features/identity/
git diff --name-only main...HEAD | grep TurmasTable
```
Expected: os quatro **sem saída** (backend intocado, locales intocadas, as 3 features consumidoras
de `useTableFilter` intocadas, `TurmasTable` fora do diff).

- [ ] **Step 2: Provar a limpeza estrutural (DoD 9, 10, 11)**

Run:
```bash
cd frontend
grep -rnE "use(Query|Mutation)\b|Api\.useList" src/features/operation/components/
grep -rn "useState(0)" src/features/operation/components/
grep -rn "from 'primereact" src/features/
grep -rnE "@features/(catalog|commercial|identity|operation)" src/features/
```
Expected: o 1º sem saída; o 2º devolve **apenas** `Turma/TurmaDetailPage.tsx` (índice da aba do
`AppTabView`, estado legítimo — não é paginação); o 3º e o 4º sem saída.

- [ ] **Step 3: Gate automatizado**

Run:
```bash
cd frontend && pnpm build && pnpm lint
cd /home/jvbat/projetos/lotus && docker compose exec -T app php artisan test
```
Expected: build e lint verdes; suíte **372 passed (1360 assertions)** — igual à baseline. Qualquer
número diferente significa que o bloco tocou o que não devia (D1).

- [ ] **Step 4: Atualizar o estado**

Em `docs/superpowers/state.md`, no frontmatter:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
active_plan: docs/superpowers/plans/2026-08-02-abstracao-componentes-operation.md
```

e reescrever a seção "Estado atual" descrevendo o que foi entregue, quais provas rodaram, e que os
dois checkpoints visuais foram aprovados (com a data).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/state.md
git commit -m "docs(estado): abstracao-componentes-operation vai a ready_for_review

Gate provado: build+lint verdes, suite backend 372 passed como
regressao, backend/locales/features consumidoras sem diff, greps de
query-em-componente e paginacao-em-componente limpos, dois checkpoints
visuais aprovados pelo Joao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Handoff de execução

**`executor: claude`**

Critério: as tasks são pequenas e de paths fechados, mas **não têm verificação executável que prove
o critério de aceite**. O frontend não tem test runner, e o DoD do bloco é "comportamento idêntico",
provado por julgamento na tela (Tasks 5 e 9) contra um `main` que só quem executa tem em mãos. Um
executor que só visse `pnpm build` verde daria o bloco por pronto — que é exatamente a falha que a
lei §5.8 proíbe. Some-se a isso a Task 1, que altera contrato em `shared/` usado por 3 features.

Não há `paths_autorizados` a declarar: nenhuma task é delegada ao Codex.
