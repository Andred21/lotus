# Frontend do Catálogo de Cursos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o frontend do módulo Catálogo (`/cursos`) — listagem + formulário de curso com habilitação de redatores — fechando a Sprint 1 (Notion 5.2.1 + 5.2.2).

**Architecture:** Espelha as features `commercial` (Client) e `identity` (Redator): fábrica `createCrudResource` (`coursesApi`, já em `shared`), `useCrudPage`, `useEntityForm`, `CrudDialog`, `AppDataTable`. Habilitação de redatores é assimétrica por design (produto + backend): editável **só no create** (exceção), sincronizada pelo endpoint dedicado `PUT courses/{course}/redatores`; em view/edit é leitura (edição mora em Pessoas). Antes de tudo, a Task 1 consolida a **camada `shared/api`** (ADR-18): todo cliente REST `createCrudResource` mora em `shared/api` (glue burro, irmão dos tipos gerados), features ficam com UI+hooks+regra — isso resolve de vez o cross-feature de listagem sem decisão caso-a-caso.

**Tech Stack:** React 19 + TS, Vite, TanStack Query, react-i18next, PrimeReact via `shared/ui`, Tailwind v4.

## Global Constraints

- **Sem test runner no frontend (CLAUDE.md §8).** DoD de cada task = `pnpm build` (tsc -b) **e** `pnpm lint` (eslint) limpos. TDD com runner não se aplica; a verificação de comportamento é o passo manual final (Task 7). Desvio de TDD justificado: mesmo padrão de todas as tasks de front deste repo (B1–B12).
- **Comandos de front rodam de `frontend/`** (Node 22/pnpm, nativo no WSL).
- **ADR-05:** feature não importa PrimeReact fora de `shared/ui`, nem outra feature. `catalog` não importa `identity`.
- **ADR-04:** `shared/types/generated.ts` NÃO se edita — os tipos (`CourseData`, `CourseRedatorData`, `RedatorData`) já existem.
- **ADR-06/03:** mutações passam pelo axios compartilhado (cookie Sanctum + CSRF); erros RFC 7807 via `useMutationErrors`.
- **i18n:** as 3 locales (`es-CL`, `pt-BR`, `en`) mantêm o MESMO conjunto de chaves (o review final exige paridade).
- **Commits terminam com:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. `git add` só os caminhos exatos da task; nunca tocar WIP do João fora do escopo.

---

## Mapa de arquivos

```
docs/adrs.md                          MODIFICAR (+ ADR-18)
shared/api/redatoresApi.ts            CRIAR (mover de features/identity/api)
shared/api/clientsApi.ts              CRIAR (mover de features/commercial/api)
shared/api/coursesApi.ts              MODIFICAR (reenquadrar docblock)
features/identity/api/redatoresApi.ts REMOVER
features/commercial/api/clientsApi.ts REMOVER
features/identity/api/useRedatorDocuments.ts   MODIFICAR import
features/identity/hooks/useRedatorForm.ts       MODIFICAR import
features/identity/hooks/useRedatoresPage.ts     MODIFICAR import
features/commercial/hooks/useClientsPage.ts     MODIFICAR import
features/commercial/hooks/useClientForm.ts      MODIFICAR import
shared/config/locales/es-CL.json      MODIFICAR (+ namespace course.*)
shared/config/locales/pt-BR.json      MODIFICAR
shared/config/locales/en.json         MODIFICAR
features/catalog/api/useCourseRedatores.ts      CRIAR
features/catalog/hooks/useCoursesPage.ts        CRIAR
features/catalog/hooks/useCourseForm.ts         CRIAR
features/catalog/components/Course/CoursesTable.tsx   CRIAR
features/catalog/components/Course/CourseDialog.tsx   CRIAR
features/catalog/components/CatalogPage.tsx     CRIAR
app/router/AppRouter.tsx              MODIFICAR (/cursos → CatalogPage)
```

Os `.gitkeep` em `features/catalog/{stores,api,components,hooks}` são substituídos pelos arquivos reais; remover só os das pastas que ganharem conteúdo.

---

## Task 1: Consolidar a camada `shared/api` (ADR-18)

Estabelece a regra: todo cliente REST `createCrudResource` vive em `shared/api` — glue burro e tipado, irmão dos tipos gerados (ADR-04). Move `redatoresApi` (identity) e `clientsApi` (commercial) para lá, reenquadra o docblock do `coursesApi`, e grava a decisão como ADR-18. Fecha o cross-feature de listagem (catalog precisa listar redatores sem importar identity — ADR-05) sem decisão caso-a-caso.

**Files:**
- Modify: `docs/adrs.md` (inserir ADR-18 após ADR-17, antes do `---`/"Pendências abertas")
- Create: `frontend/src/shared/api/redatoresApi.ts`
- Create: `frontend/src/shared/api/clientsApi.ts`
- Modify: `frontend/src/shared/api/coursesApi.ts` (docblock)
- Delete: `frontend/src/features/identity/api/redatoresApi.ts`
- Delete: `frontend/src/features/commercial/api/clientsApi.ts`
- Modify: `frontend/src/features/identity/api/useRedatorDocuments.ts` (linha 5)
- Modify: `frontend/src/features/identity/hooks/useRedatorForm.ts` (linha 5)
- Modify: `frontend/src/features/identity/hooks/useRedatoresPage.ts` (linha 2)
- Modify: `frontend/src/features/commercial/hooks/useClientsPage.ts` (linha 2)
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts` (linha 4)

**Interfaces:**
- Produces: `redatoresApi` em `@shared/api/redatoresApi` e `clientsApi` em `@shared/api/clientsApi` (ambos `createCrudResource<T>`), com `.useList()`, `.useCreate()`, `.useUpdate()`, `.useRemove()`, `.keys.all`.

- [ ] **Step 1: Gravar o ADR-18 em `docs/adrs.md`**

Inserir, imediatamente após o parágrafo "Porquê" do ADR-17 e antes do `---` que precede "## Pendências abertas":

```markdown

## ADR-18 — Frontend: clientes REST (`createCrudResource`) na camada `shared/api`

**Regra:**
- Todo cliente REST de recurso (`createCrudResource<T>('resource')`) vive em `shared/api/*Api.ts`,
  nunca dentro de uma feature.
- Feature fica com UI, hooks de tela e regra de negócio (`useXForm`, dialogs, mutações de
  sub-recurso acopladas a uma tela — ex.: `useCourseRedatores`, `useRedatorDocuments`).

**Porquê:** o cliente gerado por `createCrudResource` é glue burro e tipado sobre uma rota REST
pública do backend — mesma categoria dos tipos gerados, que já vivem todos em
`shared/types/generated.ts` (ADR-04). Não encapsula regra, então não pertence à feature; o que
encapsula (formulário, composição de tela) permanece nela. Como feature não importa feature
(ADR-05), qualquer recurso referenciado por mais de uma feature (relações cross-domínio:
redator↔curso, cotação→cliente) precisaria ser promovido — em vez de decidir caso a caso, o
cliente **sempre** nasce em `shared/api`. Mantém `shared/api` como manifesto da superfície REST do
app. Descartado: lookup fino em `shared` + CRUD na feature — duplica query keys e cria stale de
cache na invalidação (feature invalida `keys.all`, lookup usa outra key), complexidade sem retorno
a ~10 usuários.
```

- [ ] **Step 2: Criar `redatoresApi` e `clientsApi` em `shared/api`**

```ts
// frontend/src/shared/api/redatoresApi.ts
import { createCrudResource } from './createCrudResource'
import type { RedatorData } from '@shared/types/generated'

/** Cliente REST do recurso `redatores`. Camada de dados compartilhada (ADR-18):
 * o catálogo lista redatores para exibir/habilitar e a feature identity edita.
 * Glue burro sobre a rota pública — regra e telas ficam nas features. */
export const redatoresApi = createCrudResource<RedatorData>('redatores')
```

```ts
// frontend/src/shared/api/clientsApi.ts
import { createCrudResource } from './createCrudResource'
import type { ClientData } from '@shared/types/generated'

/** Cliente REST do recurso `clients`. Camada de dados compartilhada (ADR-18):
 * cotações (Comercial) referenciam cliente; a feature commercial edita o cadastro.
 * Glue burro sobre a rota pública — regra e telas ficam nas features. */
export const clientsApi = createCrudResource<ClientData>('clients')
```

- [ ] **Step 3: Reenquadrar o docblock do `coursesApi`** (o conteúdo da constante não muda)

Em `frontend/src/shared/api/coursesApi.ts`, trocar o bloco de comentário atual por:
```ts
/** Cliente REST do recurso `courses`. Camada de dados compartilhada (ADR-18):
 * o dialog do redator lista cursos para as habilitações e o módulo Catálogo o
 * consome direto. Glue burro sobre a rota pública — regra e telas nas features. */
```

- [ ] **Step 4: Remover os arquivos antigos**

```bash
git rm frontend/src/features/identity/api/redatoresApi.ts frontend/src/features/commercial/api/clientsApi.ts
```

- [ ] **Step 5: Reapontar os importadores**

`frontend/src/features/identity/api/useRedatorDocuments.ts` — trocar `import { redatoresApi } from './redatoresApi'` por `import { redatoresApi } from '@shared/api/redatoresApi'`.

`frontend/src/features/identity/hooks/useRedatorForm.ts` — trocar `import { redatoresApi } from '../api/redatoresApi'` por `import { redatoresApi } from '@shared/api/redatoresApi'`.

`frontend/src/features/identity/hooks/useRedatoresPage.ts` — trocar `import { redatoresApi } from '../api/redatoresApi'` por `import { redatoresApi } from '@shared/api/redatoresApi'`.

`frontend/src/features/commercial/hooks/useClientsPage.ts` — trocar `import { clientsApi } from '../api/clientsApi'` por `import { clientsApi } from '@shared/api/clientsApi'`.

`frontend/src/features/commercial/hooks/useClientForm.ts` — trocar `import { clientsApi } from '../api/clientsApi'` por `import { clientsApi } from '@shared/api/clientsApi'`.

- [ ] **Step 6: Build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: ambos limpos, 0 erro. (Se `pnpm build` acusar módulo não encontrado, algum import não foi reapontado.)

- [ ] **Step 7: Commit**

```bash
git add docs/adrs.md frontend/src/shared/api/redatoresApi.ts frontend/src/shared/api/clientsApi.ts frontend/src/shared/api/coursesApi.ts frontend/src/features/identity/api/useRedatorDocuments.ts frontend/src/features/identity/hooks/useRedatorForm.ts frontend/src/features/identity/hooks/useRedatoresPage.ts frontend/src/features/commercial/hooks/useClientsPage.ts frontend/src/features/commercial/hooks/useClientForm.ts
git commit -m "refactor(api): consolida clientes REST em shared/api (ADR-18)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Chaves i18n `course.*` nos 3 locales

Definidas antes dos componentes para que estes referenciem chaves reais. Reusa `common.*` existentes (rut/email/save/close/edit/cancel).

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces: namespace `course` com as chaves: `module`, `moduleDescription`, `new`, `create`, `tabCourses`, `name`, `technicalName`, `description`, `workloadHours`, `sectionGeneral`, `sectionRedatores`, `enabledRedatores`, `redatoresReadonlyNote`, `noRedatores`, `searchPlaceholder`, `empty`, `count`, `redatorCount`.

- [ ] **Step 1: Inspecionar a forma atual de um namespace de módulo**

Run (de `frontend/`): `python3 -c "import json;print(json.dumps(json.load(open('src/shared/config/locales/es-CL.json')).get('client'),ensure_ascii=False,indent=2))"`
Expected: imprime o objeto `client` — confirma indentação/estilo a seguir.

- [ ] **Step 2: Adicionar o bloco `course` em `es-CL.json`** (idioma visível da UI), como uma chave de topo irmã de `client`:

```json
"course": {
  "module": "Cursos",
  "moduleDescription": "Catálogo de cursos y sus redactores habilitados.",
  "new": "Nuevo curso",
  "create": "Crear curso",
  "tabCourses": "Cursos",
  "name": "Nombre",
  "technicalName": "Nombre técnico",
  "description": "Descripción",
  "workloadHours": "Carga horaria (h)",
  "sectionGeneral": "Datos del curso",
  "sectionRedatores": "Redactores habilitados",
  "enabledRedatores": "Redactores habilitados",
  "redatoresReadonlyNote": "La habilitación se edita en el perfil del redactor (Personas).",
  "noRedatores": "Sin redactores habilitados.",
  "searchPlaceholder": "Buscar curso...",
  "empty": "No hay cursos.",
  "count": "{{count}} curso(s)",
  "redatorCount": "Redactores"
}
```

- [ ] **Step 3: Adicionar o mesmo bloco em `pt-BR.json`** com os valores traduzidos:

```json
"course": {
  "module": "Cursos",
  "moduleDescription": "Catálogo de cursos e seus redatores habilitados.",
  "new": "Novo curso",
  "create": "Criar curso",
  "tabCourses": "Cursos",
  "name": "Nome",
  "technicalName": "Nome técnico",
  "description": "Descrição",
  "workloadHours": "Carga horária (h)",
  "sectionGeneral": "Dados do curso",
  "sectionRedatores": "Redatores habilitados",
  "enabledRedatores": "Redatores habilitados",
  "redatoresReadonlyNote": "A habilitação é editada no perfil do redator (Pessoas).",
  "noRedatores": "Sem redatores habilitados.",
  "searchPlaceholder": "Buscar curso...",
  "empty": "Nenhum curso.",
  "count": "{{count}} curso(s)",
  "redatorCount": "Redatores"
}
```

- [ ] **Step 4: Adicionar o mesmo bloco em `en.json`**:

```json
"course": {
  "module": "Courses",
  "moduleDescription": "Course catalog and their enabled writers.",
  "new": "New course",
  "create": "Create course",
  "tabCourses": "Courses",
  "name": "Name",
  "technicalName": "Technical name",
  "description": "Description",
  "workloadHours": "Workload (h)",
  "sectionGeneral": "Course data",
  "sectionRedatores": "Enabled writers",
  "enabledRedatores": "Enabled writers",
  "redatoresReadonlyNote": "Enabling is edited in the writer profile (People).",
  "noRedatores": "No enabled writers.",
  "searchPlaceholder": "Search course...",
  "empty": "No courses.",
  "count": "{{count}} course(s)",
  "redatorCount": "Writers"
}
```

- [ ] **Step 5: Validar paridade de chaves entre os 3 locales**

Run (de `frontend/`):
```bash
python3 -c "
import json
langs={l:json.load(open(f'src/shared/config/locales/{l}.json')) for l in ['es-CL','pt-BR','en']}
ks={l:set(v['course'].keys()) for l,v in langs.items()}
base=ks['es-CL']
assert all(k==base for k in ks.values()), {l:base^s for l,s in ks.items()}
print('course keys OK:',len(base))
"
```
Expected: `course keys OK: 18` (sem AssertionError). Valida também que os 3 JSON são parseáveis.

- [ ] **Step 6: Build**

Run (de `frontend/`): `pnpm build`
Expected: limpo (JSON válido, importado pelo i18n).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/en.json
git commit -m "feat(i18n): namespace course.* nos 3 locales

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Hook de sync da habilitação `useSyncCourseRedatores`

Espelho de `useRedatorDocuments`: mutação contra o endpoint dedicado, invalidando a lista de cursos. Usado só no create.

**Files:**
- Create: `frontend/src/features/catalog/api/useCourseRedatores.ts`

**Interfaces:**
- Consumes: `coursesApi.keys.all` (de `@shared/api/coursesApi`); `api` e `ProblemDetails` (de `@shared/api/axios`); `CourseData` (de `@shared/types/generated`). Endpoint backend: `PUT /api/courses/{id}/redatores` body `{ redator_ids: number[] }`, retorna `CourseData`.
- Produces: `useSyncCourseRedatores()` → mutação com `.mutate({ courseId: number; redator_ids: number[] }, { onSuccess })`, `.error: ProblemDetails | null`, `.isPending: boolean`.

- [ ] **Step 1: Criar o hook**

```ts
// frontend/src/features/catalog/api/useCourseRedatores.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { CourseData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'

/**
 * Sincroniza a habilitação redator↔curso pelo lado do curso, via endpoint
 * dedicado (`sync` = substituição total). `CourseData.redator_ids` é read-only na
 * escrita, então esta é a única forma de gravar a habilitação pelo curso. Usado
 * só no create (exceção do produto); em edit a habilitação é leitura — edição
 * mora em Pessoas. Invalida a lista de cursos para refletir a nova contagem.
 */
export function useSyncCourseRedatores() {
  const qc = useQueryClient()
  return useMutation<CourseData, ProblemDetails, { courseId: number; redator_ids: number[] }>({
    mutationFn: ({ courseId, redator_ids }) =>
      api.put<CourseData>(`/api/courses/${courseId}/redatores`, { redator_ids }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: coursesApi.keys.all }),
  })
}
```

- [ ] **Step 2: Build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: limpos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/catalog/api/useCourseRedatores.ts
git commit -m "feat(catalog): hook de sync da habilitacao redator-curso

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Hooks `useCoursesPage` e `useCourseForm`

Estado da página (lista + dialog) e do formulário (campos + submit encadeado).

**Files:**
- Create: `frontend/src/features/catalog/hooks/useCoursesPage.ts`
- Create: `frontend/src/features/catalog/hooks/useCourseForm.ts`

**Interfaces:**
- Consumes: `useCrudPage`, `useEntityForm`, `useMutationErrors` (de `@shared/hooks`); `coursesApi` (de `@shared/api/coursesApi`); `useSyncCourseRedatores` (Task 3); `CourseData` (de `@shared/types/generated`); `DialogMode` (de `@shared/lib`).
- Produces:
  - `useCoursesPage()` → `{ items: CourseData[]; loading; dialog: { mode; entity } | null; openCreate; openView; startEdit; close }`.
  - `useCourseForm(course, mode, onDone)` → `{ form: CourseFormFields; set; toggleRedator; readOnly; submit; pending; fieldErrors; generalError }`.
  - type `CourseDialogMode = DialogMode`.
  - type `CourseFormFields = Pick<CourseData, 'id'|'name'|'technical_name'|'description'|'workload_hours'|'redator_ids'>`.

- [ ] **Step 1: Criar `useCoursesPage`**

```ts
// frontend/src/features/catalog/hooks/useCoursesPage.ts
import { useCrudPage } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'

export function useCoursesPage() {
  return useCrudPage(coursesApi)
}
```

- [ ] **Step 2: Criar `useCourseForm`**

```ts
// frontend/src/features/catalog/hooks/useCourseForm.ts
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { CourseData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { coursesApi } from '@shared/api/coursesApi'
import { useSyncCourseRedatores } from '../api/useCourseRedatores'

export type CourseDialogMode = DialogMode

/**
 * Só os campos que o formulário edita. `redator_ids` fica aqui para o multiselect
 * do create, mas NÃO vai no payload do curso (o backend ignora na escrita): é
 * sincronizado pelo endpoint dedicado. `templates` fica de fora (config à parte).
 */
export type CourseFormFields = Pick<
  CourseData,
  'id' | 'name' | 'technical_name' | 'description' | 'workload_hours' | 'redator_ids'
>

const EMPTY: CourseFormFields = {
  id: undefined, name: '', technical_name: null, description: null, workload_hours: 0, redator_ids: [],
}

const toFields = (c: CourseFormFields): CourseFormFields => {
  const { id, name, technical_name, description, workload_hours, redator_ids } = c
  return structuredClone({ id, name, technical_name, description, workload_hours, redator_ids })
}

export function useCourseForm(course: CourseData | null, mode: CourseDialogMode, onDone: () => void) {
  const { form, set, setForm, readOnly } = useEntityForm<CourseFormFields>(course, mode, EMPTY, toFields)
  const create = coursesApi.useCreate()
  const update = coursesApi.useUpdate()
  const sync = useSyncCourseRedatores()

  // Updater funcional: dois toggles no mesmo tick precisam ver o array já
  // atualizado pelo anterior (mesmo motivo do toggleCourse no redator).
  const toggleRedator = (id: number) =>
    setForm((f) => ({
      ...f,
      redator_ids: f.redator_ids.includes(id)
        ? f.redator_ids.filter((x) => x !== id)
        : [...f.redator_ids, id],
    }))

  function submit() {
    // redator_ids NÃO entra: o backend ignora na escrita do curso.
    const payload = {
      name: form.name,
      technical_name: form.technical_name,
      description: form.description,
      workload_hours: form.workload_hours,
    }

    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: (created) => {
          // Exceção do produto: habilitação permitida no create. Sem redatores
          // escolhidos, não dispara a 2ª chamada à toa.
          if (form.redator_ids.length === 0) {
            onDone()
            return
          }
          sync.mutate({ courseId: created.id!, redator_ids: form.redator_ids }, { onSuccess: onDone })
        },
      })
      return
    }

    // Em edit a habilitação é só leitura (edição mora em Pessoas): só os campos.
    update.mutate({ id: course!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error, sync.error])

  return {
    form, set, toggleRedator, readOnly, submit,
    pending: create.isPending || update.isPending || sync.isPending,
    fieldErrors, generalError,
  }
}
```

- [ ] **Step 3: Build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: limpos. (Se `created.id` acusar possivelmente-undefined, o `!` resolve — id sempre presente na resposta de create.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/catalog/hooks/useCoursesPage.ts frontend/src/features/catalog/hooks/useCourseForm.ts
git commit -m "feat(catalog): hooks useCoursesPage e useCourseForm

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `CoursesTable`

Espelho exato de `ClientsTable`: busca global + `AppDataTable` + contagem.

**Files:**
- Create: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`

**Interfaces:**
- Consumes: `AppDataTable`, `AppColumn`, `AppInputText`, `AppButton` (de `@shared/ui`); `CourseData` (de `@shared/types/generated`); chaves i18n `course.*` (Task 2).
- Produces: `CoursesTable({ courses: CourseData[]; loading: boolean; onView: (c: CourseData) => void })`.

- [ ] **Step 1: Criar o componente**

```tsx
// frontend/src/features/catalog/components/Course/CoursesTable.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppInputText, AppButton } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

export function CoursesTable({
  courses, loading, onView,
}: {
  courses: CourseData[]
  loading: boolean
  onView: (c: CourseData) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('course.searchPlaceholder')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <AppDataTable
        value={courses}
        loading={loading}
        globalFilter={filter}
        globalFilterFields={['name', 'technical_name']}
        emptyMessage={t('course.empty')}
      >
        <AppColumn field="name" header={t('course.name')} sortable />
        <AppColumn header={t('course.technicalName')} body={(c: CourseData) => c.technical_name ?? '—'} />
        <AppColumn header={t('course.workloadHours')} body={(c: CourseData) => c.workload_hours} />
        <AppColumn header={t('course.redatorCount')} body={(c: CourseData) => c.redator_ids.length} />
        <AppColumn
          body={(c: CourseData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <p className="text-sm text-slate-500">{t('course.count', { count: courses.length })}</p>
    </div>
  )
}
```

- [ ] **Step 2: Build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: limpos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CoursesTable.tsx
git commit -m "feat(catalog): tabela de cursos com busca

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `CourseDialog`

`CrudDialog` com seção de dados + seção de redatores (multiselect no create, leitura em view/edit).

**Files:**
- Create: `frontend/src/features/catalog/components/Course/CourseDialog.tsx`

**Interfaces:**
- Consumes: `CrudDialog`, `AppInputText`, `AppButton` (de `@shared/ui`); `CourseData` (de `@shared/types/generated`); `redatoresApi` (de `@shared/api/redatoresApi`, Task 1); `useCourseForm`, `CourseDialogMode` (Task 4); chaves i18n `course.*` + `common.*`.
- Produces: `CourseDialog({ visible: boolean; mode: CourseDialogMode; course: CourseData | null; onHide: () => void; onEdit?: () => void })`.

- [ ] **Step 1: Criar o componente**

```tsx
// frontend/src/features/catalog/components/Course/CourseDialog.tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { redatoresApi } from '@shared/api/redatoresApi'
import { useCourseForm, type CourseDialogMode } from '../../hooks/useCourseForm'

export function CourseDialog({
  visible, mode, course, onHide, onEdit,
}: {
  visible: boolean
  mode: CourseDialogMode
  course: CourseData | null
  onHide: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const { form, set, toggleRedator, readOnly, submit, pending, fieldErrors, generalError } =
    useCourseForm(course, mode, onHide)
  const redatores = redatoresApi.useList()

  const isCreate = mode === 'create'
  const enabledIds = form.redator_ids
  // Leitura (view/edit): só os redatores já habilitados, derivados da lista viva.
  const enabledRedatores = (redatores.data ?? []).filter((r) => enabledIds.includes(r.id as number))

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={isCreate ? t('course.new') : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={isCreate ? t('course.create') : undefined}
    >
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}
      {fieldErrors && (
        <UnmappedErrors
          errors={fieldErrors}
          mapped={['name', 'technical_name', 'description', 'workload_hours']}
        />
      )}

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">{t('course.sectionGeneral')}</h3>

        <Field label={t('course.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('course.technicalName')} error={fieldErrors?.technical_name?.[0]}>
            <AppInputText value={form.technical_name ?? ''} disabled={readOnly} onChange={(e) => set('technical_name', e.target.value)} className="w-full" />
          </Field>
          <Field label={t('course.workloadHours')} error={fieldErrors?.workload_hours?.[0]}>
            <AppInputText
              value={String(form.workload_hours)}
              disabled={readOnly}
              onChange={(e) => set('workload_hours', Number(e.target.value.replace(/\D/g, '')) || 0)}
              className="w-full"
            />
          </Field>
        </div>

        <Field label={t('course.description')} error={fieldErrors?.description?.[0]}>
          <AppInputText value={form.description ?? ''} disabled={readOnly} onChange={(e) => set('description', e.target.value)} className="w-full" />
        </Field>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('course.sectionRedatores')}</h3>

        {isCreate ? (
          // Exceção do produto: habilitar redatores só no cadastro do curso.
          <div className="space-y-1">
            {(redatores.data ?? []).map((r) => (
              <label key={r.id} className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={enabledIds.includes(r.id as number)}
                  onChange={() => toggleRedator(r.id as number)}
                />
                <span className="text-sm">{r.name}</span>
              </label>
            ))}
          </div>
        ) : (
          // View/edit: leitura. A edição da habilitação mora em Pessoas.
          <div className="space-y-1">
            <p className="text-xs text-slate-500">{t('course.redatoresReadonlyNote')}</p>
            {enabledRedatores.length === 0 ? (
              <p className="text-sm text-slate-500">{t('course.noRedatores')}</p>
            ) : (
              enabledRedatores.map((r) => (
                <div key={r.id} className="rounded p-2 text-sm">{r.name}</div>
              ))
            )}
          </div>
        )}
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

- [ ] **Step 2: Build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: limpos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "feat(catalog): dialog de curso (dados + habilitacao no create, leitura em view/edit)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `CatalogPage` + religar o router

Compõe a página do módulo e troca o placeholder de `/cursos`. Ponto do verify manual (feature viva end-to-end).

**Files:**
- Create: `frontend/src/features/catalog/components/CatalogPage.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx`

**Interfaces:**
- Consumes: `ModulePage`, `ModuleTabs`, `ModuleTab`, `AppButton` (de `@shared/ui`); `useCoursesPage` (Task 4); `CoursesTable` (Task 5); `CourseDialog` (Task 6); chaves i18n `course.*`.
- Produces: `CatalogPage()` (default-less named export), montada em `/cursos`.

- [ ] **Step 1: Criar `CatalogPage`**

```tsx
// frontend/src/features/catalog/components/CatalogPage.tsx
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useCoursesPage } from '../hooks/useCoursesPage'
import { CoursesTable } from './Course/CoursesTable'
import { CourseDialog } from './Course/CourseDialog'

export function CatalogPage() {
  const { t } = useTranslation()
  const page = useCoursesPage()

  return (
    <ModulePage
      title={t('course.module')}
      description={t('course.moduleDescription')}
      actions={<AppButton variant="brandIcon" label={t('course.new')} icon="pi pi-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>
        <ModuleTab header={t('course.tabCourses')}>
          <CoursesTable courses={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
      </ModuleTabs>

      {page.dialog && (
        <CourseDialog
          visible
          mode={page.dialog.mode}
          course={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
```

- [ ] **Step 2: Religar `/cursos` no `AppRouter`**

Em `frontend/src/app/router/AppRouter.tsx`, adicionar o import (junto aos outros de features):
```tsx
import { CatalogPage } from '@features/catalog/components/CatalogPage'
```
e trocar a linha:
```tsx
          <Route path="/cursos" element={<ModulePlaceholder titleKey="nav.cursos" />} />
```
por:
```tsx
          <Route path="/cursos" element={<CatalogPage />} />
```
(`ModulePlaceholder` continua importado — ainda serve `/operacion`, `/certificados`, `/administracion`, `/perfil`.)

- [ ] **Step 3: Build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: limpos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/catalog/components/CatalogPage.tsx frontend/src/app/router/AppRouter.tsx
git commit -m "feat(catalog): CatalogPage + rota /cursos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: Verify manual no browser (DoD real — CLAUDE.md §4)**

Pré: `docker compose up -d` (API) e, de `frontend/`, `pnpm dev`. Logar como admin/superadmin.

Exercitar contra a API real e observar:
1. `/cursos` renderiza a listagem (sem chave i18n crua na tela) e a busca filtra por nome/nome técnico.
2. "Novo curso" → preencher nome/nome técnico/carga/descrição, **marcar 1+ redatores**, salvar → curso aparece na lista com a contagem de redatores correta.
3. "Novo curso" **sem** marcar redator → salva sem erro (não dispara o sync).
4. Abrir um curso (view) → seção de redatores mostra os habilitados em **leitura** + a nota apontando Pessoas; sem checkbox.
5. Editar um curso → campos editáveis, seção de redatores continua leitura; salvar altera os campos.
6. Em Pessoas, habilitar/ desabilitar um curso no perfil de um redator → reabrir o curso reflete a mudança na leitura.
7. Trocar idioma (es/pt/en) → todos os rótulos de curso traduzem.

Registrar o resultado no `progress.md`. Só marcar a feature completa após o item 2 e 4 provados (habilitação encadeada + leitura).

---

## Self-Review (feito na escrita do plano)

- **Cobertura do spec:** consolidar camada shared/api + ADR-18 (T1, engloba o "mover redatoresApi" do spec e estende a clientsApi/coursesApi por decisão do João) ✔; i18n 3 locales (T2) ✔; sync hook + falha parcial (T3, tratada no submit da T4) ✔; useCoursesPage/useCourseForm com regra create-vs-leitura (T4) ✔; CoursesTable com busca e colunas definidas (T5) ✔; CourseDialog com dados + multiselect-no-create + leitura-em-view/edit + UnmappedErrors (T6) ✔; CatalogPage + router + verify manual (T7) ✔. Fora de escopo (templates, turmas) não geram task, conforme spec.
- **Placeholders:** nenhum "TBD"/"similar a"; todo passo tem código/comando reais.
- **Consistência de tipos:** `useSyncCourseRedatores().mutate({ courseId, redator_ids })` (T3) casa com o uso na T4; `CourseFormFields`/`CourseDialogMode` (T4) casam com o consumo na T6; `CoursesTable`/`CourseDialog` props casam com o uso na T7; `redatoresApi` de `@shared/api/redatoresApi` (T1) casa com o import na T6.
