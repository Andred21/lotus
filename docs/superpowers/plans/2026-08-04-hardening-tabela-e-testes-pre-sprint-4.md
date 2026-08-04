# Hardening · tabela e testes pré-Sprint 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar o item 1 do backlog entregando H.4.4 (moldura compartilhada em 5 tabelas), H.4.5
(escape do seletor ESLint fechado + aliases justificados) e H.4.9 (setup de teste repetido vira
trait), sem mudar comportamento em lugar nenhum.

**Architecture:** `SearchableTableFrame` nasce em `shared/ui` como wrapper apresentacional puro —
recebe o estado de busca pronto, não chama hook — e absorve toolbar, empty de busca e a chamada ao
`AppDataTable`, que as 5 tabelas repetiam literalmente. No frontend o guardrail existente ganha um
seletor por argumento, no mesmo bloco de `rules`. No backend, `tests/Support/CreatesDomainRecords`
concentra os dois setups que 49 arquivos de teste repetem.

**Tech Stack:** React 19 + TS (Vite), PrimeReact via `shared/ui`, ESLint flat config, PHPUnit sobre
sqlite `:memory:`, vitest (jsdom) no frontend.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-04-hardening-tabela-e-testes-pre-sprint-4-design.md`.
  As decisões D1–D14 valem para todas as tasks.
- **Nenhum arquivo de produção do backend muda** (D14): `git diff main...HEAD -- backend/app/
  backend/database/` fica **vazio** no fim.
- **Placar imutável** (D13): backend fecha em **376 passed (1366 assertions)**; `pnpm test` em
  **21 passed**. Número diferente = extração comeu asserção; reverta o arquivo, não ajuste o número.
- **Nenhuma chave i18n nova, nenhum DTO tocado:** `generated.ts` e `locales/*.json` sem diff.
- **Comportamento idêntico:** as 7 invariantes da spec §4 valem em toda adoção do H.4.4.
- **Sonda é temporária:** toda sonda de lint/teste é removida no mesmo step que a criou, e
  `git status` volta limpo antes do commit.
- **Pint só nos arquivos tocados** (lição 9): `./vendor/bin/pint <arquivos>`, nunca sem argumento.
- Backend roda no container: `docker compose exec -T app php artisan test`. Frontend é nativo, de
  `frontend/`.
- Branch no **main tree, sem worktree** (P-03 — o bloco toca `backend/` e o compose aponta para o
  main tree).

---

### Task 0: Branch e baseline

**Files:** nenhum.

**Interfaces:**
- Produces: branch `hardening/tabela-e-testes` e os números de baseline que as Tasks 1–6 comparam.

- [ ] **Step 1: Conferir árvore limpa**

```bash
cd /home/jvbat/projetos/lotus && git status --short && git rev-parse --abbrev-ref HEAD
```

Esperado: saída vazia, branch `main`. **Árvore suja PARA a task** — o João edita o working tree ao
vivo e o WIP dele é intocável (lição 9). Reporte o que está sujo e peça decisão.

- [ ] **Step 2: Criar a branch**

```bash
git checkout -b hardening/tabela-e-testes
```

- [ ] **Step 3: Baseline do backend**

```bash
docker compose up -d
docker compose exec -T app php artisan test 2>&1 | tail -5
```

Esperado: `Tests: 376 passed (1366 assertions)`. **Divergiu? PARE** — o plano inteiro compara contra
este número.

- [ ] **Step 4: Baseline do frontend**

```bash
cd frontend && pnpm test 2>&1 | tail -5 && pnpm build 2>&1 | tail -3 && pnpm lint
```

Esperado: `Tests  21 passed`, build sem erro, lint sem saída.

---

### Task 1: `SearchableTableFrame` e as 2 tabelas nomeadas

**Files:**
- Create: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx`
- Create: `frontend/src/shared/ui/SearchableTableFrame/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentsTable.tsx`

**Interfaces:**
- Produces: `SearchableTableFrame<T>` e `SearchableTableState<T>`, consumidos pela Task 2.

- [ ] **Step 1: Criar o componente**

`frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable } from '../AppDataTable'
import { AppCardToolbar } from '../AppCardToolbar'
import { AppEmptyState } from '../AppEmptyState'
import { AppInputText } from '../AppInputText'
import { AppButton } from '../AppButton'

/** O que a moldura consome do estado de busca. Estruturalmente compatível com
 * `TableFilter<T>` de `shared/hooks`, **sem importar de lá**: `shared/ui` e
 * `shared/hooks` não se importam em nenhuma direção, e a moldura não abre a
 * primeira aresta (spec D3). Mesmo padrão do `error` do `AppDataTable`, que
 * aceita `ProblemDetails` sem depender de `shared/api`. */
export interface SearchableTableState<T> {
  filter: string
  term: string
  rows: T[]
  first: number
  onFilterChange: (value: string) => void
  onPage: (event: { first: number }) => void
  clear: () => void
}

export interface SearchableTableFrameProps<T> {
  /** Vem pronto da feature — quem declara `searchable` é quem tem o vocabulário
   * de domínio (spec D3). */
  table: SearchableTableState<T>
  searchPlaceholder: string
  /** O vazio DE DOMÍNIO (ícone, título, ação de cadastro). O vazio de BUSCA é
   * genérico nas 5 tabelas e a moldura monta sozinha (spec D4). */
  emptyState: ReactNode
  footerCount: ReactNode
  actions?: ReactNode
  loading?: boolean
  error?: { detail?: string | null } | null
  onRetry?: () => void
  /** As `<AppColumn/>`. */
  children: ReactNode
}

/** Moldura de tabela em card com busca: toolbar, os dois empty states, corpo e
 * rodapé-paginador. As 5 tabelas busca-só repetiam este bloco literalmente —
 * diferiam só em `searchable`, ícone, 3 chaves i18n e `footerCount`.
 *
 * Não entram aqui: `BudgetsTable`/`TurmasTable` (dropdown de filtro por cima),
 * `RolesTable` (sem busca) e `EnrollmentTable` (sem toolbar) — spec D2. */
export function SearchableTableFrame<T>({
  table,
  searchPlaceholder,
  emptyState,
  footerCount,
  actions,
  loading,
  error,
  onRetry,
  children,
}: SearchableTableFrameProps<T>) {
  const { t } = useTranslation()

  const empty =
    table.term === '' ? (
      emptyState
    ) : (
      <AppEmptyState
        icon="pi pi-search"
        title={t('common.noResults', { term: table.filter.trim() })}
        description={t('common.noResultsHint')}
        action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={table.clear} />}
      />
    )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={searchPlaceholder}
              value={table.filter}
              onChange={(e) => table.onFilterChange(e.target.value)}
            />
          </div>
        }
        end={error ? undefined : actions}
      />
      <AppDataTable
        value={table.rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={footerCount}
        first={table.first}
        onPage={table.onPage}
      >
        {children}
      </AppDataTable>
    </>
  )
}
```

- [ ] **Step 2: Criar o index da pasta**

`frontend/src/shared/ui/SearchableTableFrame/index.ts`:

```ts
export { SearchableTableFrame } from './SearchableTableFrame'
export type { SearchableTableFrameProps, SearchableTableState } from './SearchableTableFrame'
```

- [ ] **Step 3: Exportar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, acrescentar em ordem alfabética (a regra do arquivo é um
`export *` por pasta, sem caminho fundo):

```ts
export * from './SearchableTableFrame'
```

- [ ] **Step 4: Provar que o tipo fecha antes de adotar**

```bash
cd frontend && pnpm build 2>&1 | tail -5
```

Esperado: build verde. **Se o `tsc` reclamar de `value={table.rows}`** (o `AppDataTable` é genérico
em `T extends DataTableValueArray`, um array, enquanto a moldura é genérica no item), a saída é um
cast localizado **dentro da moldura**, nunca no consumidor:

```tsx
import type { DataTableValueArray } from 'primereact/datatable'
// …
value={table.rows as unknown as DataTableValueArray}
```

Um único ponto de conciliação, como a spec §3 exige.

- [ ] **Step 5: Adotar em `RedatoresTable`**

`frontend/src/features/identity/components/Redator/RedatoresTable.tsx` passa a ser (as 5
`<AppColumn/>` ficam **byte a byte idênticas** às linhas 60-92 do arquivo atual):

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import { AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade, IDONEIDADE_SEVERITY } from '@shared/lib'

export function RedatoresTable({
  redatores, loading, onView, actions, error, onRetry,
}: {
  redatores: RedatorData[]
  loading: boolean
  onView: (r: RedatorData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(redatores, (r) => [r.name, r.rut])

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('redator.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-users" title={t('redator.empty')} description={t('redator.emptyHint')} action={actions} />
      }
      footerCount={t('redator.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="name"
        header={t('redator.name')}
        sortable
        body={(r: RedatorData) => (
          <div className="flex items-center gap-3">
            <AppAvatar name={r.name} image={r.photo_url} size="large" />
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{r.email}</p>
            </div>
          </div>
        )}
      />
      <AppColumn
        header={t('common.rut')}
        body={(r: RedatorData) => <span className="font-mono text-sm">{r.rut}</span>}
      />
      <AppColumn
        header={t('redator.enabledCourses')}
        body={(r: RedatorData) => <span className="font-semibold">{r.course_ids.length}</span>}
      />
      <AppColumn
        header={t('redator.suitability')}
        body={(r: RedatorData) => {
          const k = idoneidade(r)
          return <AppTag value={t(`suitability.${k}`)} severity={IDONEIDADE_SEVERITY[k]} />
        }}
      />
      <AppColumn
        body={(r: RedatorData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(r)} />}
        style={{ width: '4rem' }}
      />
    </SearchableTableFrame>
  )
}
```

- [ ] **Step 6: Adotar em `StudentsTable`**

`frontend/src/features/identity/components/Student/StudentsTable.tsx`, mesma transformação (as 5
colunas ficam idênticas às linhas 59-94 do arquivo atual):

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import { AppColumn, AppAvatar, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
import type { StudentData } from '@shared/types/generated'

export function StudentsTable({
  students, loading, onView, actions, error, onRetry,
}: {
  students: StudentData[]
  loading: boolean
  onView: (s: StudentData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(students, (s) => [s.name, s.rut])

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('student.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-user" title={t('student.empty')} description={t('student.emptyHint')} action={actions} />
      }
      footerCount={t('student.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="name"
        header={t('student.name')}
        sortable
        body={(s: StudentData) => (
          <div className="flex items-center gap-3">
            <AppAvatar name={s.name} image={s.photo_url} size="large" />
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{s.email}</p>
            </div>
          </div>
        )}
      />
      <AppColumn
        header={t('common.rut')}
        body={(s: StudentData) => <span className="font-mono text-sm">{s.rut}</span>}
      />
      <AppColumn
        header={t('student.currentClient')}
        body={(s: StudentData) =>
          s.current_client_name ?? (
            <span style={{ color: 'var(--text-color-secondary)' }}>{t('student.noClient')}</span>
          )
        }
      />
      <AppColumn
        header={t('student.turmas')}
        body={(s: StudentData) => <span className="font-semibold">{s.enrollments_count}</span>}
      />
      <AppColumn
        body={(s: StudentData) => (
          <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(s)} />
        )}
        style={{ width: '4rem' }}
      />
    </SearchableTableFrame>
  )
}
```

- [ ] **Step 7: Verificar**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint && pnpm test 2>&1 | tail -3
```

Esperado: build verde, lint sem saída, `Tests  21 passed`.

- [ ] **Step 8: Conferir que nenhuma invariante escapou**

```bash
cd frontend && grep -n 'AppDataTable\|AppCardToolbar\|AppInputText' \
  src/features/identity/components/Redator/RedatoresTable.tsx \
  src/features/identity/components/Student/StudentsTable.tsx
```

Esperado: **saída vazia** — os três só existem dentro da moldura agora.

- [ ] **Step 9: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/ui/SearchableTableFrame frontend/src/shared/ui/index.ts \
  frontend/src/features/identity/components/Redator/RedatoresTable.tsx \
  frontend/src/features/identity/components/Student/StudentsTable.tsx
git commit -m "refactor(ui): moldura de tabela com busca passa a ter um lugar só"
```

---

### Task 2: As outras 3 tabelas

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx`

**Interfaces:**
- Consumes: `SearchableTableFrame` da Task 1.

- [ ] **Step 1: Adotar em `ClientsTable`**

Trocar o corpo de `frontend/src/features/commercial/components/Client/ClientsTable.tsx`. Imports
passam a ser:

```tsx
import { AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
```

E o `return` (as 6 `<AppColumn/>` das linhas 61-79 ficam idênticas):

```tsx
  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('client.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-building" title={t('client.empty')} description={t('client.emptyHint')} action={actions} />
      }
      footerCount={t('client.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {/* as 6 <AppColumn/> atuais, sem uma alteração */}
    </SearchableTableFrame>
  )
```

O comentário de 3 linhas sobre os dois vazios distintos (linhas 22-24) **sai daqui** — o motivo
agora vive uma vez só, no JSDoc de `emptyState` da moldura.

- [ ] **Step 2: Adotar em `UsersTable`**

Mesma transformação em `frontend/src/features/identity/components/Admin/UsersTable.tsx`. Imports:

```tsx
import { AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
```

```tsx
  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('admin.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-users" title={t('admin.empty')} description={t('admin.emptyHint')} action={actions} />
      }
      footerCount={t('admin.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {/* as 4 <AppColumn/> atuais (linhas 59-86), sem uma alteração */}
    </SearchableTableFrame>
  )
```

- [ ] **Step 3: Adotar em `CoursesTable`**

Mesma transformação em `frontend/src/features/catalog/components/Course/CoursesTable.tsx`. Imports:

```tsx
import { AppColumn, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { BRAND_COLOR } from '@shared/config/brand'
```

```tsx
  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('course.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-book" title={t('course.empty')} description={t('course.emptyHint')} action={actions} />
      }
      footerCount={t('course.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {/* as <AppColumn/> atuais (a partir da linha 81), sem uma alteração —
          inclusive a que lê BRAND_COLOR */}
    </SearchableTableFrame>
  )
```

Este arquivo está com aspas duplas e quebra de linha diferentes dos outros 4 (prettier anterior ao
bloco). Normalizar o arquivo tocado é aceitável; **reformatar qualquer outro não é** (spec §3).

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint && pnpm test 2>&1 | tail -3
```

Esperado: build verde, lint sem saída, `Tests  21 passed`.

- [ ] **Step 5: Provar que as 5 adotaram e que as 4 de fora não mudaram**

```bash
cd frontend
echo "--- devem citar a moldura (esperado: 5 linhas):"
grep -rln 'SearchableTableFrame' src/features
echo "--- não podem mais citar os 3 primitivos (esperado: vazio):"
grep -rln 'AppCardToolbar\|AppInputText' src/features/identity/components/Redator/RedatoresTable.tsx \
  src/features/identity/components/Student/StudentsTable.tsx \
  src/features/catalog/components/Course/CoursesTable.tsx \
  src/features/commercial/components/Client/ClientsTable.tsx \
  src/features/identity/components/Admin/UsersTable.tsx
echo "--- as 4 de fora, intocadas (esperado: vazio):"
cd /home/jvbat/projetos/lotus && git diff main...HEAD --name-only -- \
  frontend/src/features/commercial/components/Budget/BudgetsTable.tsx \
  frontend/src/features/operation/components/Turma/TurmasTable.tsx \
  frontend/src/features/identity/components/Admin/RolesTable.tsx \
  frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx
```

- [ ] **Step 6: Provar que as colunas são movimento literal**

As colunas mudam de pai, não de conteúdo. A contagem por arquivo tem de bater com a de `main`:

```bash
cd /home/jvbat/projetos/lotus
for f in frontend/src/features/identity/components/Redator/RedatoresTable.tsx \
         frontend/src/features/identity/components/Student/StudentsTable.tsx \
         frontend/src/features/catalog/components/Course/CoursesTable.tsx \
         frontend/src/features/commercial/components/Client/ClientsTable.tsx \
         frontend/src/features/identity/components/Admin/UsersTable.tsx; do
  printf "%-70s antes:%s agora:%s\n" "$f" \
    "$(git show main:"$f" | grep -c '<AppColumn')" "$(grep -c '<AppColumn' "$f")"
done
```

Esperado: os dois números iguais em todos os 5. Diferente = uma coluna sumiu ou nasceu, e a task
**para** — é mudança de comportamento, não extração.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/catalog/components/Course/CoursesTable.tsx \
  frontend/src/features/commercial/components/Client/ClientsTable.tsx \
  frontend/src/features/identity/components/Admin/UsersTable.tsx
git commit -m "refactor(ui): cursos, clientes e usuários adotam a moldura"
```

---

### Task 3: H.4.5 — fechar o escape do seletor

**Files:**
- Modify: `frontend/eslint.config.js:75-101`
- Modify: os 7 aliases em `frontend/src/features/*/hooks/use*Page.ts`
- Modify: `.claude/rules/frontend-fsliced.md`
- Sonda temporária: `frontend/src/features/catalog/components/Course/SondaEscape.tsx`

**Interfaces:**
- Produces: o seletor `CallExpression[arguments.0.name=/Api$/]` sob `src/features/*/components/**`.

- [ ] **Step 1: Escrever a sonda e provar que o buraco existe HOJE**

Criar `frontend/src/features/catalog/components/Course/SondaEscape.tsx`:

```tsx
import { useCrudPage } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'

export function SondaEscape() {
  const page = useCrudPage(coursesApi)
  return <div>{page.items.length}</div>
}
```

```bash
cd frontend && pnpm lint 2>&1 | grep -A2 SondaEscape
```

Esperado: **nenhum erro de `no-restricted-syntax`** — é o buraco que a task existe para fechar.
Se já reprovar aqui, PARE: a premissa da task está errada e o corte precisa de decisão do João.

- [ ] **Step 2: Adicionar o seletor**

Em `frontend/eslint.config.js`, dentro do array de `no-restricted-syntax` do bloco
`src/features/*/components/**` (linha 75), **entre o segundo seletor e `FORMDATA_FORA_DO_HELPER`**:

```js
        {
          // O escape do seletor acima: `useCrudPage(budgetsApi)` não casa
          // `xxxApi.useAlgo()`, mas a query está lá dentro do mesmo jeito — o
          // `useCrudPage` chama `resource.useList()`. Casa pelo ARGUMENTO, não
          // pelo nome do hook: banir `useCrudPage` fecharia só o caso conhecido
          // e `useOutraCoisa(clientsApi)` escaparia igual amanhã, que é como
          // este buraco nasceu (spec D5). Os `xxxApi.keys.all` dos 4 diálogos
          // não são argumento de chamada e seguem passando.
          selector: 'CallExpression[arguments.0.name=/Api$/]',
          message:
            'Recurso de API não entra em componente de feature nem como argumento: consuma um hook de features/<x>/hooks/ (frontend-fsliced.md).',
        },
```

- [ ] **Step 3: Ver a sonda reprovar pelo motivo certo**

```bash
cd frontend && pnpm lint 2>&1 | grep -A2 SondaEscape
```

Esperado: erro citando `SondaEscape.tsx` com a mensagem "Recurso de API não entra em componente de
feature nem como argumento". **A sintaxe `arguments.0.name` do esquery é premissa, não certeza**
(spec §3): se não disparar, ajuste o seletor até disparar — nunca siga com um seletor mudo.

- [ ] **Step 4: Provar os dois falsos positivos que NÃO podem acontecer**

```bash
cd frontend && pnpm lint 2>&1 | grep -E 'ClientDialog|StaffUserDialog|StudentDialog|RedatorDialog|use[A-Za-z]+Page'
```

Esperado: **saída vazia**. Os 4 `xxxApi.keys.all` dos diálogos não são argumento de chamada, e os 7
aliases vivem em `hooks/`, fora do escopo do bloco. Se algum aparecer, o seletor está largo demais.

- [ ] **Step 5: Provar que os seletores antigos continuam vivos**

Acrescentar temporariamente à sonda, dentro do componente:

```tsx
  const lista = coursesApi.useList()
```

```bash
cd frontend && pnpm lint 2>&1 | grep -c 'SondaEscape'
```

Esperado: **2 ou mais** ocorrências — o seletor novo e o antigo disparando no mesmo arquivo. Isso é
a prova de que o merge raso de `rules` não apagou nada (spec D6); um único erro significa colisão.

- [ ] **Step 6: Apagar a sonda**

```bash
cd frontend && rm src/features/catalog/components/Course/SondaEscape.tsx && pnpm lint && cd .. && git status --short
```

Esperado: lint sem saída; `git status` mostrando só `eslint.config.js` modificado.

- [ ] **Step 7: JSDoc nos 7 aliases**

O mesmo bloco em cada um dos 7 arquivos, acima da função (`useCoursesPage`, `useBudgetsPage`,
`useClientsPage`, `useRedatoresPage`, `useRolesPage`, `useStudentsPage`, `useUsersPage`), com o nome
do recurso trocado. Exemplo de `frontend/src/features/commercial/hooks/useBudgetsPage.ts`:

```ts
/** Alias de página do recurso de orçamentos.
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `budgetsApi` para dentro de `CommercialPage` — regressão
 * da fronteira zerada em 2026-08-03, e que passaria no lint antigo, porque o
 * seletor casava `budgetsApi.useList()` e não `useCrudPage(budgetsApi)`. Esse
 * escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
```

- [ ] **Step 8: Registrar na rule**

Em `.claude/rules/frontend-fsliced.md`, no parágrafo "Componente de feature = declarativo", depois da
frase sobre `useMutationErrors`, acrescentar:

```md
  O seletor casa também o **argumento**: `useCrudPage(budgetsApi)` dentro de um componente reprova,
  porque a query mora dentro do `useCrudPage` do mesmo jeito. É por isso que os 7 aliases
  `useXPage` existem em `features/<x>/hooks/` — eles não são delegação vazia, são o que mantém a
  query fora da página; eliminá-los regrediria a fronteira e o lint antigo não veria (2026-08-04).
```

- [ ] **Step 9: Verificar e commitar**

```bash
cd frontend && pnpm lint && pnpm build 2>&1 | tail -3 && cd ..
git add frontend/eslint.config.js frontend/src/features/*/hooks/use*Page.ts .claude/rules/frontend-fsliced.md
git commit -m "fix(lint): recurso de API como argumento em componente passa a reprovar"
```

---

### Task 4: H.4.9 — trait de setup de teste  ·  **executor: codex**

**Files:**
- Create: `backend/tests/Support/CreatesDomainRecords.php`
- Modify: até 49 arquivos sob `backend/tests/Feature/**`

**Interfaces:**
- Produces: `Tests\Support\CreatesDomainRecords` com `makeClientWithUser(array $overrides = []):
  Client` e `makeCourse(array $overrides = []): Course`.

- [ ] **Step 1: Criar o trait**

`backend/tests/Support/CreatesDomainRecords.php` (o autoload-dev já mapeia `Tests\` → `tests/`;
**não toque em `composer.json`**):

```php
<?php

namespace Tests\Support;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;

/**
 * Setup repetido em três ou mais cenários (H.4.9). Só entra aqui o que foi
 * MEDIDO como repetição: o cliente com usuário da RN-01 (43 arquivos) e o curso
 * descartável (34). Budget, Quote e Turma ficam de fora de propósito — têm pai
 * obrigatório e o valor criado costuma ser a própria regra sob teste, então
 * extraí-los esconderia a regra (spec D8).
 *
 * Todo método aceita override porque o dado às vezes É a asserção (spec D9).
 */
trait CreatesDomainRecords
{
    /** Cliente com o User inativo que a RN-01 exige (cliente não loga). */
    protected function makeClientWithUser(array $overrides = []): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client', ...$overrides]);
    }

    /** Curso sem significado próprio, quando o teste só precisa de um id de
     * curso válido. Carga horária que É a regra medida passa por override. */
    protected function makeCourse(array $overrides = []): Course
    {
        return Course::create(['name' => 'C', 'workload_hours' => 8, ...$overrides]);
    }
}
```

- [ ] **Step 2: Provar o trait num arquivo só, antes de espalhar**

Em `backend/tests/Feature/Comercial/BudgetCrudTest.php`: apagar o `private function clientId(): int`
(linhas 16-20), declarar `use Tests\Support\CreatesDomainRecords;` no topo e `use
CreatesDomainRecords;` na classe, e trocar as chamadas `$this->clientId()` por
`$this->makeClientWithUser()->id`.

```bash
docker compose exec -T app php artisan test --filter=BudgetCrudTest 2>&1 | tail -5
```

Esperado: mesmo número de testes e assertions que antes da mudança. **Diferente? PARE** e reverta o
arquivo — é o sinal da spec D13.

- [ ] **Step 3: Migrar os 43 arquivos do bloco cliente+usuário**

Alvos:

```bash
cd /home/jvbat/projetos/lotus/backend/tests && grep -rlF "type' => 'cliente'" .
```

Em cada um: declarar o trait, trocar o bloco literal por `makeClientWithUser(...)` e apagar o helper
privado local quando ele existir. **Os 14 helpers locais que morrem** (4 nomes para a mesma coisa):
`client()` em `BudgetModelTest`, `ClientContactMinimumTest`, `CreateStudentActionTest`,
`StudentCrudTest`, `StudentDataTest`, `StudentHistoryDataTest`, `UpdateStudentActionTest`,
`SoftDeletedRelationProjectionTest`; `clientId()` em `BudgetCrudTest`; `makeClient()` em
`ClientNestedTest`, `StudentClientLinkServiceTest`, `StudentResolverTest`;
`makeClientWithPrimary()` em `PrimaryAddressTest` e `PrimaryContactTest`.

`makeClientWithPrimary` **não vira método do trait** (spec D11 — 2 ocorrências, abaixo do critério de
3): os dois arquivos chamam `makeClientWithUser()` e criam o contato principal na linha seguinte,
explícito.

Quem passava `legal_name` diferente (`'Transelec'`, sufixos) passa por override:
`makeClientWithUser(['legal_name' => 'Transelec'])`.

- [ ] **Step 4: Migrar os 34 arquivos do curso descartável**

```bash
cd /home/jvbat/projetos/lotus/backend/tests && grep -rlF "Course::create(" .
```

Só as ocorrências **descartáveis** (`workload_hours => 8` com nome irrelevante — `'C'`, `'AT'`,
`'Curso X'`, `'C1'`, `'Curso Y'`) viram `makeCourse()`. As que carregam a regra medida
(`workload_hours => 24`, `=> 40`, `=> 4`, e os nomes reais como `'Trabajos en líneas 220kV'`) passam
por override e **continuam explícitas** no teste.

- [ ] **Step 5: Matar os 6 `actingAdmin` de repasse**

Em `ClientCrudTest`, `CourseCrudTest`, `CourseTemplateTest`, `HabilitacaoTest`, `RedatorCrudTest` e
`PendingQuotesTest`: apagar o `private function actingAdmin()` e trocar as chamadas por
`$this->actingAsAdmin()`, que já existe no `TestCase`. Dois deles declaram `: User` e quatro
`: void` — quem usava o retorno continua usando (`actingAsAdmin` devolve `User`).

- [ ] **Step 6: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -5
```

Esperado, **exatamente**: `Tests: 376 passed (1366 assertions)`. Qualquer outro número **PARA a
task** — reverta o arquivo que causou a diferença e reporte; não ajuste o número esperado.

- [ ] **Step 7: Provar que nenhum helper duplicado sobreviveu**

```bash
cd /home/jvbat/projetos/lotus/backend/tests
echo "--- helpers que deviam ter morrido (esperado: vazio):"
grep -rn 'private function \(client\|clientId\|makeClient\|makeClientWithPrimary\|actingAdmin\)\b' .
echo "--- bloco cliente+usuário fora do trait (esperado: só CreatesDomainRecords.php):"
grep -rlF "type' => 'cliente'" .
```

- [ ] **Step 8: Provar que produção não foi tocada**

```bash
cd /home/jvbat/projetos/lotus && git diff --name-only -- backend/app/ backend/database/
```

Esperado: **saída vazia** (spec D14).

- [ ] **Step 9: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
ARQUIVOS=$(cd .. && git diff --name-only -- 'backend/**/*.php' | sed 's|^backend/||')
[ -n "$ARQUIVOS" ] && ./vendor/bin/pint $ARQUIVOS
cd /home/jvbat/projetos/lotus
git add backend/tests
git commit -m "test: setup repetido de cliente e curso passa a ter um lugar só"
```

A guarda de lista vazia não é cerimônia: `pint` sem argumento reformata o repositório inteiro
(lição 9).

**Regras de parada desta task (delegada):** placar diferente de 376/1366 no Step 6 **para**; diff em
`backend/app/` ou `backend/database/` **para**; qualquer arquivo onde a extração exigiria mudar uma
asserção **para** e fica de fora com a razão reportada. Nenhum commit é feito sem o diff revisado
por Claude antes.

---

### Task 5: Checkpoint visual  ·  **executor: joão**

**Files:** nenhum.

- [ ] **Step 1: Subir o ambiente**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d && cd frontend && pnpm dev
```

- [ ] **Step 2: O João confere as 4 páginas / 5 tabelas**

Em cada uma — Personas (aba **Redatores** e aba **Alumnos**), Catálogo (**Cursos**), Comercial
(**Clientes**), Administração (**Usuários**) — os 4 estados:

1. lista cheia, com paginação quando passa de 10 linhas;
2. busca sem resultado → empty state citando o termo + **Limpar busca** funcionando;
3. lista vazia de verdade → empty state do domínio com a ação de cadastro;
4. erro de GET → `AppErrorState` com **Reintentar**, e a toolbar **sem** as ações.

Nada pode ter mudado de aparência. A aprovação é do João; sem ela a task não fecha.

---

### Task 6: Gate

**Files:** nenhum (só sondas temporárias).

- [ ] **Step 1: Suíte backend do zero**

```bash
cd /home/jvbat/projetos/lotus && docker compose exec -T app php artisan test 2>&1 | tail -5
```

Esperado: `Tests: 376 passed (1366 assertions)`.

- [ ] **Step 2: Frontend do zero**

```bash
cd frontend && pnpm test 2>&1 | tail -3 && pnpm build 2>&1 | tail -3 && pnpm lint
```

Esperado: `Tests  21 passed`, build verde, lint sem saída.

- [ ] **Step 3: Sonda fresca do guardrail do H.4.5 (lição 10)**

Criar `frontend/src/features/commercial/components/Budget/SondaGate.tsx`:

```tsx
import { useCrudPage } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'

export function SondaGate() {
  const page = useCrudPage(budgetsApi)
  return <div>{page.items.length}</div>
}
```

```bash
cd frontend && pnpm lint 2>&1 | grep -A2 SondaGate
rm src/features/commercial/components/Budget/SondaGate.tsx
cd .. && git status --short
```

Esperado: erro citando `SondaGate.tsx` com a mensagem do seletor novo; depois do `rm`, `git status`
limpo. **Sonda diferente da Task 3 de propósito** — outra feature, outro recurso: prova que a regra
não foi calibrada para um arquivo só.

- [ ] **Step 4: Diffs proibidos**

```bash
cd /home/jvbat/projetos/lotus
echo "--- backend de produção (esperado: vazio):"
git diff main...HEAD --name-only -- backend/app/ backend/database/
echo "--- tipos e locales (esperado: vazio):"
git diff main...HEAD --name-only -- frontend/src/shared/types/generated.ts frontend/src/shared/config/locales/
```

- [ ] **Step 5: Órfãos**

```bash
cd frontend
echo "--- consumidores da moldura (esperado: 5):"
grep -rl 'SearchableTableFrame' src/features | wc -l
echo "--- arquivos que declaram o trait (esperado: > 40):"
cd ../backend/tests && grep -rl 'CreatesDomainRecords' . | wc -l
```

- [ ] **Step 6: Pint nos arquivos de backend tocados**

```bash
cd /home/jvbat/projetos/lotus/backend
ARQUIVOS=$(cd .. && git diff main...HEAD --name-only -- 'backend/**/*.php' | sed 's|^backend/||')
[ -n "$ARQUIVOS" ] && ./vendor/bin/pint --test $ARQUIVOS || echo "nenhum arquivo php tocado"
```

Esperado: `PASS`.

- [ ] **Step 7: Placar final**

Registrar no relatório de fechamento: suíte backend, `pnpm test`, build, lint, Pint, os diffs
proibidos vazios, a sonda vista reprovando e removida, e a aprovação visual do João (Task 5).

---

## Handoff de execução

**executor: misto**

- **Task 4 vai ao Codex.** Migração mecânica com paths fechados (`backend/tests/**`), verificação
  executável (o placar 376/1366 decide sozinho) e regras de parada explícitas. Nenhuma decisão em
  aberto: o trait está literal no plano e a lista de alvos sai de `grep`.
  `paths_autorizados`: `backend/tests/**`
- **Tasks 0, 1, 2, 3 e 6 ficam com Claude.** A 1 e a 2 mudam 5 telas de produção e a prova é visual;
  a 3 toca `eslint.config.js`, que vale para o repositório inteiro, e a colisão de flat config já
  mordeu o projeto duas vezes; a 0 julga árvore suja e baseline divergente; a 6 julga o placar.
- **Task 5 é do João.**

## Pendências de fechamento (fora das tasks)

1. **Editar o item 1 do `backlog.md`** — com as três entregues, o item fecha por inteiro e sai da
   fila. Planejamento não edita backlog; isso é do `/fechar-sprint`.
2. **Avaliar se as 2 tabelas com dropdown ganham gatilho registrado** para adotar a moldura quando
   houver slot de filtro — hoje é decisão adiada (spec D2), não esquecimento.
