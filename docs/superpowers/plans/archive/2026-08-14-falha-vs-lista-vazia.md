# Falha que se disfarça de lista vazia (BD-6) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer três sítios de `commercial` distinguirem **carregando**, **falha com Reintentar** e
**vazio de verdade**, em vez de absorverem o GET falho em `?? []` / `?? '—'` e deixarem a tela
afirmar que não há dado.

**Architecture:** o par "linha de erro / dica de vazio sob um controle" vira o componente
`InlineLoadState` em `shared/ui`, e cada hook de sítio passa a expor `isError`/`errorDetail`/
`refetch` ao lado da lista derivada — mesmo desenho de `useRedatorCourses` e `useStudentClients`, que
já resolvem isso em `identity`. Nenhum padrão novo: padrão já decidido (D11/D16), aplicado onde
faltou.

**Tech Stack:** React 19 + TS, TanStack Query (`retry: false`, medido em
`app/providers/AppProviders.tsx:8`), PrimeReact via `shared/ui`, Tailwind v4 só para layout,
i18next com três locales, Vitest + Testing Library (jsdom), Playwright CLI para o gate.

**Spec:** `docs/superpowers/specs/2026-08-14-falha-vs-lista-vazia-design.md` — D1–D9.

## Global Constraints

Valem para **todas** as tasks.

- **Lei §5.6:** feature importa componente só de `@shared/ui`, nunca `primereact` direto, e nunca
  outra feature. `InlineLoadState` entra no barrel `shared/ui/index.ts` (um `export * from './X'`
  por pasta, sem caminho fundo).
- **Lei §5.3:** `generated.ts` não é editado. Nenhum DTO muda neste bloco.
- **ADR-16 / catraca de cor:** cor vem de variável do tema (`style={{ color: 'var(--…)' }}` ou
  `dangerText` de `@shared/styles/tokens`). Utility Tailwind de cor (`text-slate-500` e irmãs) em
  `className` **reprova o lint** fora da lista `CATRACA_COR`.
- **i18n:** toda chave nova entra nos **três** arquivos (`es-CL`, `pt-BR`, `en`) — `parity.test.ts`
  reprova o desalinhamento.
- **Régua de tamanho:** arquivo de componente/hook fica **abaixo de 150 linhas** (catraca
  `max-lines`).
- **Um commit por task**, mensagem em português com tipo convencional (`feat:`, `refactor:`,
  `test:`).
- **Tudo roda de `frontend/`:** `pnpm lint`, `pnpm build`, `pnpm test`. Backend não é tocado —
  `git diff --name-only main...HEAD -- backend/` tem de terminar **vazio** (P-03 não dispara).
- **Baseline medido em `0c18595`:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
  **32 arquivos / 163 testes**. Projeção final deste plano: **35 arquivos / 174 testes** (+3
  arquivos, +11 casos). A spec §6 projetou "~177" por estimativa; **174 é a contagem exata das
  tasks**, e é esse o número que o gate confere.
- **Fora de escopo, declarado:** `CourseStep.tsx` e `QuoteWizard.tsx` continuam na lista
  `CATRACA_COR` do `eslint.config.js` — tirá-los exige converter `hover:bg-slate-*` e
  `text-slate-500`, que é desenho de cor e não este bloco.

**Fato medido que muda como o gate prova a falha:** `GET /api/courses` **não tem middleware de
permissão** (`app/Domains/Catalog/routes.php:11` — só `auth:sanctum`), então não há 403 a provocar
por RBAC. A falha se produz redirecionando o XHR para uma rota inexistente (Task 6), não revogando
permissão.

**Fato medido que remove um risco do plano:** PrimeReact **renderiza em jsdom** e `fireEvent`
funciona — probe executada em 2026-08-14 com `AppInputText`, `AppRadioButton`, `AppButton` e com a
`QuotesList` inteira (que monta `AppFileUpload`), ambas passando. Os testes das Tasks 1, 3 e 4 não
dependem de mockar PrimeReact.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `frontend/src/shared/ui/InlineLoadState/InlineLoadState.tsx` (novo) | linha de falha / dica de vazio sob um controle, com Reintentar | 1 |
| `frontend/src/shared/ui/InlineLoadState/index.ts` (novo) | reexport da pasta | 1 |
| `frontend/src/shared/ui/InlineLoadState/InlineLoadState.test.tsx` (novo) | 4 casos: dois ramos, ambos, nenhum | 1 |
| `frontend/src/shared/ui/index.ts` | barrel raiz | 1 |
| `frontend/src/features/identity/components/Student/StudentClientField.tsx` | perde a cópia local do par | 2 |
| `frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts` | passa a expor os cinco estados | 3 |
| `frontend/src/features/commercial/components/Budget/CourseStep.tsx` | guardas sequenciais dos cinco estados | 3 |
| `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx` | passa o hook inteiro ao passo 1 | 3 |
| `frontend/src/features/commercial/components/Budget/CourseStep.test.tsx` (novo) | 5 casos, um por ramo | 3 |
| `frontend/src/features/commercial/hooks/useQuotesListCourses.ts` | expõe `isError`/`errorDetail`/`refetch` | 4 |
| `frontend/src/features/commercial/components/Budget/QuotesList.tsx` | aviso no card sem esconder as linhas | 4 |
| `frontend/src/features/commercial/components/Budget/QuotesList.test.tsx` (novo) | 2 casos: com e sem falha | 4 |
| `frontend/src/features/commercial/hooks/useCommercialClients.ts` | ganha `isError`/`errorDetail`/`showEmptyHint`/`unusable` | 5 |
| `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx` | dropdown com motivo e Reintentar | 5 |
| `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` | `budget.noClientsAvailable` | 5 |

---

### Task 1: `InlineLoadState` em `shared/ui`

**Files:**
- Create: `frontend/src/shared/ui/InlineLoadState/InlineLoadState.tsx`
- Create: `frontend/src/shared/ui/InlineLoadState/index.ts`
- Create: `frontend/src/shared/ui/InlineLoadState/InlineLoadState.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts` (uma linha, entre `FormSection` e `LanguageMenu`)

**Interfaces:**
- Consumes: `AppButton` (`../AppButton`), `dangerText` (`../../styles/tokens`).
- Produces: `InlineLoadState({ error?: string | null, emptyHint?: string | null, retryLabel: string,
  onRetry: () => void })` e o tipo `InlineLoadStateProps`. Renderiza `null` quando `error` e
  `emptyHint` são ambos ausentes. Consumido pelas Tasks 2, 4 e 5.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/shared/ui/InlineLoadState/InlineLoadState.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InlineLoadState } from './InlineLoadState'

afterEach(() => {
  cleanup()
})

describe('InlineLoadState', () => {
  it('não renderiza nada quando não há falha nem lista vazia', () => {
    const { container } = render(
      <InlineLoadState error={null} emptyHint={null} retryLabel="Reintentar" onRetry={() => {}} />,
    )

    // O componente vive DENTRO de um FormField e de um card: renderizar
    // moldura vazia empurraria layout sem ter o que dizer.
    expect(container.firstChild).toBeNull()
  })

  it('anuncia a falha como alert e chama o Reintentar', () => {
    const onRetry = vi.fn()
    render(<InlineLoadState error="No se pudo cargar" retryLabel="Reintentar" onRetry={onRetry} />)

    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar')
    fireEvent.click(screen.getByText('Reintentar'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('a dica de vazio NÃO é alert: lista vazia não é anomalia', () => {
    render(<InlineLoadState emptyHint="No hay clientes" retryLabel="Reintentar" onRetry={() => {}} />)

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('No hay clientes')).toBeTruthy()
  })

  it('mostra os dois ramos juntos, cada um com o seu Reintentar', () => {
    render(
      <InlineLoadState
        error="Falla de red"
        emptyHint="No hay clientes"
        retryLabel="Reintentar"
        onRetry={() => {}}
      />,
    )

    expect(screen.getByText('Falla de red')).toBeTruthy()
    expect(screen.getByText('No hay clientes')).toBeTruthy()
    expect(screen.getAllByText('Reintentar')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm vitest run src/shared/ui/InlineLoadState/InlineLoadState.test.tsx
```

Esperado: FALHA com `Failed to resolve import "./InlineLoadState"`.

- [ ] **Step 3: Implementar**

Crie `frontend/src/shared/ui/InlineLoadState/InlineLoadState.tsx`:

```tsx
import { AppButton } from '../AppButton'
import { dangerText } from '../../styles/tokens'

export interface InlineLoadStateProps {
  /** Motivo da falha do GET (o `detail` do RFC 7807, ou a dica genérica).
   * Ausente => sem ramo de falha. */
  error?: string | null
  /** Lista que carregou e veio vazia de verdade. Ausente => sem ramo de dica.
   * Distinto de `error` de propósito: vazio convida a cadastrar, falha convida
   * a reintentar, e trocar um pelo outro faz a tela mentir. */
  emptyHint?: string | null
  retryLabel: string
  onRetry: () => void
}

/**
 * Linha compacta sob um controle que CONTINUA utilizável: por que a lista dele
 * não veio, ou por que ela está vazia, com Reintentar em qualquer dos casos.
 *
 * Distinto do `AppErrorState`, que é o bloco centrado de uma tela ou lista
 * inteira em falha. Aqui o dropdown segue montado e as linhas seguem visíveis —
 * a falha explica o que falta, não substitui o que veio (spec BD-6 D2/D5).
 *
 * Só a falha carrega `role="alert"`: lista vazia não é anomalia a interromper
 * leitura de tela.
 */
export function InlineLoadState({ error, emptyHint, retryLabel, onRetry }: InlineLoadStateProps) {
  if (!error && !emptyHint) return null

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mt-1 flex items-center justify-between gap-2 text-xs"
          style={{ color: dangerText }}
        >
          <span>{error}</span>
          <AppButton label={retryLabel} text onClick={onRetry} />
        </p>
      )}
      {emptyHint && (
        <p
          className="mt-1 flex items-center justify-between gap-2 text-xs"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          <span>{emptyHint}</span>
          <AppButton label={retryLabel} text onClick={onRetry} />
        </p>
      )}
    </>
  )
}
```

Crie `frontend/src/shared/ui/InlineLoadState/index.ts`:

```ts
export * from './InlineLoadState'
```

- [ ] **Step 4: Exportar pelo barrel**

Em `frontend/src/shared/ui/index.ts`, insira a linha entre `export * from './FormSection'` e
`export * from './LanguageMenu'`:

```ts
export * from './InlineLoadState'
```

- [ ] **Step 5: Rodar e ver passar**

```bash
pnpm vitest run src/shared/ui/InlineLoadState/InlineLoadState.test.tsx
```

Esperado: `Test Files 1 passed`, `Tests 4 passed`.

- [ ] **Step 6: Lint e build**

```bash
pnpm lint && pnpm build
```

Esperado: exit 0 nos dois.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/InlineLoadState frontend/src/shared/ui/index.ts
git commit -m "feat(ui): InlineLoadState distingue falha de lista vazia sob um controle"
```

---

### Task 2: retrofit do `StudentClientField`

Paga a duplicação antes que ela nasça: o par de linhas que a Task 1 extraiu vive hoje escrito à mão
em `identity`. Duplicar ao lado é o padrão que o próprio review reprova (precedente `mergePt`, BD-5).

**Files:**
- Modify: `frontend/src/features/identity/components/Student/StudentClientField.tsx:1-92`

**Interfaces:**
- Consumes: `InlineLoadState` da Task 1.
- Produces: nada novo — a assinatura de props do `StudentClientField` **não muda**, e o
  `StudentDialog.tsx:85` segue chamando igual.

- [ ] **Step 1: Trocar os dois blocos pelo componente**

O arquivo mantém o estilo local (aspas duplas, ponto e vírgula). Substitua as duas primeiras linhas
de import:

```tsx
import { useTranslation } from "react-i18next";
import { AppDropdown, FormField, InlineLoadState } from "@shared/ui";
import type { DialogMode } from "@shared/lib";
```

(`AppButton` e `dangerText` saem — o componente novo é quem os usa agora; deixá-los importados
reprova no lint por variável não usada.)

E substitua o bloco `{isError && (…)}` … `{showEmptyHint && (…)}` (hoje linhas 54-81) por:

```tsx
        <InlineLoadState
          error={isError ? (errorDetail ?? t("common.loadErrorHint")) : null}
          emptyHint={showEmptyHint ? t("student.noClientsAvailable") : null}
          retryLabel={t("common.retry")}
          onRetry={refetch}
        />
```

Nada mais muda: `FormField`, `AppDropdown`, o `disabled={unusable}` e o parágrafo
`student.clientLocked` do modo `edit` ficam onde estão.

- [ ] **Step 2: Ver que a suíte inteira continua verde**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test
```

Esperado: `Test Files 33 passed`, `Tests 167 passed` (baseline 32/163 mais os 4 casos da Task 1).

- [ ] **Step 3: Lint e build**

```bash
pnpm lint && pnpm build
```

Esperado: exit 0 nos dois. Se o lint reclamar de `AppButton` ou `dangerText` não usados, o Step 1
não removeu os imports.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/components/Student/StudentClientField.tsx
git commit -m "refactor(identity): dropdown de cliente do aluno usa InlineLoadState"
```

O ganho de comportamento está declarado na spec (D8): o ramo de falha passa a ter `role="alert"`,
que a cópia local não tinha.

---

### Task 3: passo 1 do wizard com os cinco estados

**Files:**
- Modify: `frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts:1-19` (arquivo inteiro)
- Modify: `frontend/src/features/commercial/components/Budget/CourseStep.tsx:1-47` (arquivo inteiro)
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx:20,67-74`
- Create: `frontend/src/features/commercial/components/Budget/CourseStep.test.tsx`

**Interfaces:**
- Consumes: `coursesApi.useList()`; `AppErrorState`, `AppSkeleton`, `AppInputText`,
  `AppRadioButton`, `FormSection` de `@shared/ui`.
- Produces: `useQuoteCourseSearch()` devolvendo
  `{ list: CourseData[], search: string, setSearch: (v: string) => void, isLoading: boolean,
  isError: boolean, errorDetail: string | undefined, refetch: () => void, isEmpty: boolean,
  noResults: boolean }`; `CourseStep({ courses: ReturnType<typeof useQuoteCourseSearch>,
  selectedId: number, onSelect: (id: number) => void })`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/features/commercial/components/Budget/CourseStep.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CourseData } from '@shared/types/generated'
import type { useQuoteCourseSearch } from '../../hooks/useQuoteCourseSearch'
import { CourseStep } from './CourseStep'

/** `t` devolve a chave: o que se prova aqui é QUAL estado o passo mostra, não o
 * texto traduzido (isso é do `parity.test.ts`). */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

type Courses = ReturnType<typeof useQuoteCourseSearch>

const CURSO = { id: 1, name: 'Alta tensión', workload_hours: 8 } as CourseData

/** Estado feliz; cada teste sobrescreve só o que o SEU ramo muda. */
const base: Courses = {
  list: [CURSO],
  search: '',
  setSearch: () => {},
  isLoading: false,
  isError: false,
  errorDetail: undefined,
  refetch: () => {},
  isEmpty: false,
  noResults: false,
}

const renderStep = (courses: Partial<Courses>) =>
  render(<CourseStep courses={{ ...base, ...courses }} selectedId={0} onSelect={() => {}} />)

afterEach(() => {
  cleanup()
})

describe('CourseStep — os cinco estados', () => {
  it('carregando: esqueleto com aria-busy e SEM campo de busca', () => {
    const { container } = renderStep({ isLoading: true, list: [] })

    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
    // Filtrar coisa nenhuma é controle morto.
    expect(screen.queryByPlaceholderText('quote.courseSearchPlaceholder')).toBeNull()
  })

  it('falha: erro com Reintentar, e NUNCA a mensagem de catálogo vazio', () => {
    renderStep({ isError: true, errorDetail: 'Sin conexión', list: [] })

    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    expect(screen.getByText('common.retry')).toBeTruthy()
    // É o B-7 inteiro: 403 não pode virar "no hay cursos".
    expect(screen.queryByText('course.empty')).toBeNull()
  })

  it('catálogo vazio de verdade: mensagem própria, sem alarme de falha', () => {
    renderStep({ isEmpty: true, list: [] })

    expect(screen.getByText('course.empty')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })

  it('termo sem resultado: a busca continua na tela, a lista some', () => {
    renderStep({ noResults: true, search: 'zzz', list: [] })

    expect(screen.getByPlaceholderText('quote.courseSearchPlaceholder')).toBeTruthy()
    expect(screen.getByText('common.noResults')).toBeTruthy()
    expect(screen.queryByText('Alta tensión')).toBeNull()
  })

  it('lista: busca e curso na tela', () => {
    renderStep({})

    expect(screen.getByPlaceholderText('quote.courseSearchPlaceholder')).toBeTruthy()
    expect(screen.getByText('Alta tensión')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm vitest run src/features/commercial/components/Budget/CourseStep.test.tsx
```

Esperado: FALHA de tipo/props — o `CourseStep` de hoje recebe `list`/`search`/`onSearch`, não
`courses`.

- [ ] **Step 3: Expor os cinco estados no hook**

Reescreva `frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts` inteiro:

```ts
import { useState } from 'react'
import { coursesApi } from '@shared/api/coursesApi'

/** Busca de curso do passo 1 do wizard de cotação: query, termo e lista filtrada.
 *
 * Os estados saem daqui SEPARADOS — carregando, falha, catálogo vazio, termo sem
 * resultado — porque a tela precisa distingui-los: o `?? []` sozinho fazia um GET
 * falho virar "não há cursos", que é o débito B-7, pago neste bloco. O `?? []`
 * fica, mas só para derivar a lista; `isError` viaja ao lado dele, no mesmo
 * desenho do `useRedatorCourses` (D11). */
export function useQuoteCourseSearch() {
  const courses = coursesApi.useList()
  const [search, setSearch] = useState('')

  const all = courses.data ?? []
  const list = all.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))

  return {
    list,
    search,
    setSearch,
    isLoading: courses.isLoading,
    isError: courses.isError,
    errorDetail: courses.error?.detail,
    refetch: () => {
      void courses.refetch()
    },
    /** Catálogo vazio de verdade: respondeu, sem erro, e não veio curso nenhum. */
    isEmpty: !courses.isError && courses.isSuccess && all.length === 0,
    /** Há catálogo, mas o termo não casa com nada. Estado do FILTRO, não do GET. */
    noResults: all.length > 0 && list.length === 0,
  }
}
```

- [ ] **Step 4: Reescrever o `CourseStep` como guardas sequenciais**

Reescreva `frontend/src/features/commercial/components/Budget/CourseStep.tsx` inteiro:

```tsx
import { useTranslation } from 'react-i18next'
import { AppErrorState, AppInputText, AppRadioButton, AppSkeleton, FormSection } from '@shared/ui'
import type { useQuoteCourseSearch } from '../../hooks/useQuoteCourseSearch'

/**
 * Passo 1 do wizard: escolher o curso, com os cinco estados que o BD-6 exige
 * distinguíveis — carregando, falha com Reintentar, catálogo vazio de verdade,
 * termo sem resultado e lista. Eram um só caminho, e um GET falho caía no
 * quarto sem dizer nada.
 *
 * A busca só aparece quando há catálogo: filtrar lista que não veio é controle
 * morto. Todo ramo mantém o `FormSection`, para o passo nunca ficar sem título.
 */
export function CourseStep({
  courses, selectedId, onSelect,
}: {
  /** O hook inteiro, e não `list`/`search` soltos: o termo digitado mora no
   * estado dele e o wizard o monta uma vez só — trazer o hook para cá o
   * reiniciaria a cada ida e volta entre os passos. */
  courses: ReturnType<typeof useQuoteCourseSearch>
  selectedId: number
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()

  if (courses.isLoading) {
    return (
      <section className="space-y-3" aria-busy="true">
        <FormSection title={t('quote.stepCourse')} />
        <AppSkeleton height="2.5rem" />
        <AppSkeleton height="2.5rem" />
      </section>
    )
  }

  if (courses.isError) {
    return (
      <section className="space-y-3">
        <FormSection title={t('quote.stepCourse')} />
        <AppErrorState
          title={t('common.loadError')}
          detail={courses.errorDetail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={courses.refetch}
        />
      </section>
    )
  }

  if (courses.isEmpty) {
    return (
      <section className="space-y-3">
        <FormSection title={t('quote.stepCourse')} />
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('course.empty')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <FormSection title={t('quote.stepCourse')} />
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('quote.courseSearchPlaceholder')}
        value={courses.search}
        onChange={(e) => courses.setSearch(e.target.value)}
      />
      {courses.noResults ? (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('common.noResults', { term: courses.search.trim() })}
        </p>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {courses.list.map((c) => (
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
      )}
    </section>
  )
}
```

As duas utilities de cor (`hover:bg-slate-*`, `text-slate-500`) são as que já existiam e por isso o
arquivo está em `CATRACA_COR`; **não** as troque aqui (Global Constraints).

- [ ] **Step 5: Passar o hook inteiro no `QuoteWizard`**

Em `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`, troque a linha 20:

```tsx
  const courses = useQuoteCourseSearch()
```

e o ramo do passo 1 (hoje linhas 67-74):

```tsx
      {step === 1 ? (
        <CourseStep
          courses={courses}
          selectedId={form.course_id}
          onSelect={(id) => set('course_id', id)}
        />
      ) : (
```

`canAdvance` não muda (D3): quem edita e já escolheu curso continua avançando mesmo com o GET falho.

- [ ] **Step 6: Rodar e ver passar**

```bash
pnpm vitest run src/features/commercial/components/Budget/CourseStep.test.tsx
```

Esperado: `Test Files 1 passed`, `Tests 5 passed`.

- [ ] **Step 7: Suíte, lint e build**

```bash
pnpm test && pnpm lint && pnpm build
```

Esperado: `Test Files 34 passed`, `Tests 172 passed`; lint e build exit 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts \
        frontend/src/features/commercial/components/Budget/CourseStep.tsx \
        frontend/src/features/commercial/components/Budget/QuoteWizard.tsx \
        frontend/src/features/commercial/components/Budget/CourseStep.test.tsx
git commit -m "feat(commercial): passo 1 do wizard distingue carga, falha e catalogo vazio"
```

---

### Task 4: aviso de falha no card de cotações

**Files:**
- Modify: `frontend/src/features/commercial/hooks/useQuotesListCourses.ts:1-12` (arquivo inteiro)
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx:1-53`
- Create: `frontend/src/features/commercial/components/Budget/QuotesList.test.tsx`

**Interfaces:**
- Consumes: `InlineLoadState` da Task 1.
- Produces: `useQuotesListCourses()` devolvendo
  `{ courseName: (id: number) => string, isError: boolean, errorDetail: string | undefined,
  refetch: () => void }`. A assinatura de props da `QuotesList` **não muda**.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/features/commercial/components/Budget/QuotesList.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { QuoteData } from '@shared/types/generated'
import { QuotesList } from './QuotesList'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

const cursos = vi.hoisted(() => ({
  current: { isError: false, errorDetail: undefined as string | undefined },
}))

vi.mock('../../hooks/useQuotesListCourses', () => ({
  useQuotesListCourses: () => ({
    courseName: () => 'Alta tensión',
    isError: cursos.current.isError,
    errorDetail: cursos.current.errorDetail,
    refetch: () => {},
  }),
}))

vi.mock('../../hooks/useQuoteFiles', () => ({
  useQuoteFiles: () => ({
    fileError: null,
    sizeError: null,
    isUploading: () => false,
    upload: () => {},
    remove: () => {},
    setSizeError: () => {},
  }),
}))

const COTACAO = {
  id: 1, course_id: 7, status: 'pending', value_uf: '10', student_count: 2, files: [],
} as unknown as QuoteData

afterEach(() => {
  cleanup()
  cursos.current = { isError: false, errorDetail: undefined }
})

describe('QuotesList sob falha do GET de cursos', () => {
  it('avisa da falha SEM esconder as cotações', () => {
    cursos.current = { isError: true, errorDetail: 'Sin conexión' }

    render(<QuotesList quotes={[COTACAO]} />)

    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    // O ponto da D2: valor UF, status e arquivos vieram do GET do orçamento, que
    // carregou bem — esconder o registro por falha de NOME é o erro inverso.
    expect(screen.getByText('Alta tensión')).toBeTruthy()
  })

  it('sem falha não há aviso nenhum', () => {
    render(<QuotesList quotes={[COTACAO]} />)

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Alta tensión')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm vitest run src/features/commercial/components/Budget/QuotesList.test.tsx
```

Esperado: FALHA no primeiro caso — `Unable to find role="alert"` (hoje nada anuncia a falha).

- [ ] **Step 3: Expor a falha no hook**

Reescreva `frontend/src/features/commercial/hooks/useQuotesListCourses.ts` inteiro:

```ts
import { coursesApi } from '@shared/api/coursesApi'

/** Nome do curso por id para a lista de cotações.
 *
 * O `'—'` FICA: numa lista carregada, id que não casa é dado (curso removido),
 * não falha. Quem desambigua GET falho é `isError`, exposto ao lado — sem ele um
 * 500 pintava a coluna inteira de `—` em silêncio (B-7, spec D6). */
export function useQuotesListCourses() {
  const courses = coursesApi.useList()

  return {
    courseName: (id: number) => courses.data?.find((c) => c.id === id)?.name ?? '—',
    isError: courses.isError,
    errorDetail: courses.error?.detail,
    refetch: () => {
      void courses.refetch()
    },
  }
}
```

- [ ] **Step 4: Mostrar o aviso no card**

Em `frontend/src/features/commercial/components/Budget/QuotesList.tsx`:

1. importe o componente novo — a linha 2 vira

```tsx
import { FormErrorBanner, InlineLoadState } from '@shared/ui'
```

2. troque a desestruturação da linha 18 por

```tsx
  const courses = useQuotesListCourses()
```

3. dentro do wrapper `<div className="m-4 empty:m-0">`, depois dos dois `FormErrorBanner`, acrescente

```tsx
        {/* Falha do GET de cursos NÃO esconde as cotações (D2): o que ela explica
         * é o `—` no lugar do nome. Erro de mutação de arquivo é outra categoria
         * e continua nos banners acima. */}
        <InlineLoadState
          error={courses.isError ? (courses.errorDetail ?? t('common.loadErrorHint')) : null}
          retryLabel={t('common.retry')}
          onRetry={courses.refetch}
        />
```

4. na linha do `QuoteRow`, troque `courseName={courseName(q.course_id)}` por

```tsx
            courseName={courses.courseName(q.course_id)}
```

O early return de `quotes.length === 0` fica intocado (D7): sem cotação não há nome a resolver.

- [ ] **Step 5: Rodar e ver passar**

```bash
pnpm vitest run src/features/commercial/components/Budget/QuotesList.test.tsx
```

Esperado: `Test Files 1 passed`, `Tests 2 passed`.

- [ ] **Step 6: Suíte, lint e build**

```bash
pnpm test && pnpm lint && pnpm build
```

Esperado: `Test Files 35 passed`, `Tests 174 passed`; lint e build exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial/hooks/useQuotesListCourses.ts \
        frontend/src/features/commercial/components/Budget/QuotesList.tsx \
        frontend/src/features/commercial/components/Budget/QuotesList.test.tsx
git commit -m "feat(commercial): card de cotacoes avisa falha do GET de cursos"
```

---

### Task 5: dropdown de cliente do orçamento com motivo e Reintentar

**Files:**
- Modify: `frontend/src/features/commercial/hooks/useCommercialClients.ts:1-25`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx:2,5,22,54-65`
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json` (uma chave em cada)

**Interfaces:**
- Consumes: `InlineLoadState` da Task 1.
- Produces: `useCommercialClients()` passa a devolver, **além** do que já devolvia
  (`isLoading`, `loadError`, `refetch`, `clientName`, `clientOptions`):
  `isError: boolean`, `errorDetail: string | undefined`, `showEmptyHint: boolean`,
  `unusable: boolean`. Adição pura — `BudgetsTable` continua lendo o que lia.

- [ ] **Step 1: Derivar os estados no hook**

Em `frontend/src/features/commercial/hooks/useCommercialClients.ts`, acrescente as quatro chaves ao
objeto devolvido, logo depois de `loadError`:

```ts
    isError: clients.isError,
    errorDetail: clients.error?.detail,
    /** Lista que carregou e veio vazia de verdade — nem falha, nem carregando.
     * Tem mensagem própria, distinta da de falha. */
    showEmptyHint: !clients.isError && clients.isSuccess && clients.data.length === 0,
    /** Sem lista utilizável: carregando, falhou sem cache, ou veio vazia. `[]` é
     * truthy, então `!clients.data` deixaria passar lista vazia. Um refetch que
     * falha com dado já em cache NÃO trava o form (precedente `03280c6`). */
    unusable: !clients.data?.length,
```

- [ ] **Step 2: Chave nova nos três locales**

Em cada arquivo, ao lado da chave `budget.client`:

`frontend/src/shared/config/locales/es-CL.json`
```json
    "noClientsAvailable": "No hay clientes registrados. Registra un cliente primero.",
```

`frontend/src/shared/config/locales/pt-BR.json`
```json
    "noClientsAvailable": "Nenhum cliente cadastrado. Cadastre um cliente primeiro.",
```

`frontend/src/shared/config/locales/en.json`
```json
    "noClientsAvailable": "No clients registered yet. Register a client first.",
```

- [ ] **Step 3: Consumir no diálogo**

Em `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx`:

1. a linha 2 vira

```tsx
import { CrudDialog, AppInputText, AppDropdown, FormField, FormErrorSummary, FormErrorBanner, InlineLoadState } from '@shared/ui'
```

2. a linha 22 vira

```tsx
  const clients = useCommercialClients()
```

3. o `FormField` do cliente (hoje linhas 54-65) vira

```tsx
        <FormField
          label={t('budget.client')}
          error={fieldErrors?.client_id?.[0]}
          readOnly={readOnly || !isCreate}
          value={clients.clientOptions.find((o) => o.value === form.client_id)?.label ?? ''}
        >
          <AppDropdown
            value={form.client_id}
            options={clients.clientOptions}
            disabled={clients.unusable}
            onChange={(e) => set('client_id', e.value as number)}
          />
          {/* Dropdown vazio sem explicação é o disfarce do BD-6: quem não
           * consegue listar clientes precisa LER o motivo e poder reintentar,
           * em vez de concluir que não há cliente cadastrado. */}
          <InlineLoadState
            error={clients.isError ? (clients.errorDetail ?? t('common.loadErrorHint')) : null}
            emptyHint={clients.showEmptyHint ? t('budget.noClientsAvailable') : null}
            retryLabel={t('common.retry')}
            onRetry={clients.refetch}
          />
        </FormField>
```

O comentário existente sobre cliente imutável fora do `create` fica onde está.

- [ ] **Step 4: Suíte, lint e build**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test && pnpm lint && pnpm build
```

Esperado: `Test Files 35 passed`, `Tests 174 passed` — inclusive `parity.test.ts`, que é quem prova
que a chave entrou nos três locales. Lint e build exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial/hooks/useCommercialClients.ts \
        frontend/src/features/commercial/components/Budget/BudgetDialog.tsx \
        frontend/src/shared/config/locales
git commit -m "feat(commercial): dropdown de cliente do orcamento mostra motivo e Reintentar"
```

---

### Task 6: gate final — a spec §7, medida

Sem código novo. Se um passo reprovar, o conserto vira **commit próprio** e o gate recomeça do
Step 1.

**Files:**
- Nenhum arquivo de produção. Evidência vai para `.superpowers/sdd/progress.md`.

**Interfaces:**
- Consumes: tudo das Tasks 1-5.
- Produces: o veredito do bloco.

- [ ] **Step 1: Suíte e escopo**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm lint && pnpm build && pnpm test
cd /home/jvbat/projetos/lotus
git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: lint exit 0, build verde, **35 arquivos / 174 testes**, e o `git diff` **sem nenhuma
linha** — é o que torna backend, Pint e `typescript:transform` N/A por escopo medido, e o que prova
a lei §5.3.

- [ ] **Step 1b: Provar que os testes novos veem o ramo (spec §7.2, nos dois sentidos)**

Teste verde não prova que o teste olha para o lugar certo. Um ramo de cada vez, **plantando a sonda,
conferindo que ela foi plantada, medindo e restaurando**:

```bash
cd /home/jvbat/projetos/lotus/frontend

# 1. CourseStep: derruba o ramo de falha (o erro passa a cair no ramo de lista)
perl -0pi -e 's/if \(courses\.isError\) \{/if (false) {/' src/features/commercial/components/Budget/CourseStep.tsx
grep -n "if (false) {" src/features/commercial/components/Budget/CourseStep.tsx   # a sonda TEM de aparecer
pnpm vitest run src/features/commercial/components/Budget/CourseStep.test.tsx
git checkout -- src/features/commercial/components/Budget/CourseStep.tsx

# 2. QuotesList: derruba o aviso
perl -0pi -e 's/courses\.isError \?/false ?/' src/features/commercial/components/Budget/QuotesList.tsx
grep -n "false ?" src/features/commercial/components/Budget/QuotesList.tsx
pnpm vitest run src/features/commercial/components/Budget/QuotesList.test.tsx
git checkout -- src/features/commercial/components/Budget/QuotesList.tsx

# 3. InlineLoadState: derruba o role="alert"
perl -0pi -e 's/role="alert"//' src/shared/ui/InlineLoadState/InlineLoadState.tsx
grep -c 'role="alert"' src/shared/ui/InlineLoadState/InlineLoadState.tsx   # TEM de imprimir 0
pnpm vitest run src/shared/ui/InlineLoadState/InlineLoadState.test.tsx
git checkout -- src/shared/ui/InlineLoadState/InlineLoadState.tsx
```

Esperado, em cada um: o `grep` confirma a sonda **antes** do vitest (sem isso, "não reprovou" fica
ambíguo entre "o teste é cego" e "a sonda não foi plantada" — precedente da Task 8 do login), o
vitest **reprova nomeando o caso** (`falha: erro com Reintentar…`, `avisa da falha SEM esconder as
cotações`, `anuncia a falha como alert…`), e o `git checkout` devolve a árvore. Ao final:

```bash
git status --porcelain   # vazio
pnpm test                # 35 arquivos / 174 testes de novo
```

- [ ] **Step 2: Subir a stack**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d
cd frontend && pnpm dev   # deixe rodando em background
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/login
```

Esperado: `200`.

- [ ] **Step 3: Contar os cursos ANTES de mexer no banco**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan tinker --execute="echo 'vivos=' . \App\Domains\Catalog\Models\Course::count() . ' trashed=' . \App\Domains\Catalog\Models\Course::onlyTrashed()->count();"
```

Anote os dois números: o Step 7 tem de devolver o banco a eles.

- [ ] **Step 4: Entrar no sistema**

Os `e<ref>` deste gate **não são placeholders a inventar**: cada `playwright-cli snapshot` imprime os
refs vivos da página (`e3`, `e15`, …) e é de lá que eles saem, um por vez.

```bash
playwright-cli open http://localhost:5173/login
playwright-cli snapshot
playwright-cli fill e<ref-do-email> "admin@lotus.cl"
playwright-cli fill e<ref-da-senha> "senha123" --submit
playwright-cli find "Comercial"
```

Esperado: o menu do sistema no snapshot (login aceito).

- [ ] **Step 5: Prova A — GET de cursos falhando (os dois sítios de uma vez)**

O `GET /api/courses` não tem middleware de permissão, então a falha se produz redirecionando o XHR
para uma rota inexistente. **Sem recarregar a página depois disto** — recarga apaga o patch.

```bash
playwright-cli eval "(() => { const O = XMLHttpRequest.prototype.open; window.__unpatch = () => { XMLHttpRequest.prototype.open = O; return 'restored' }; XMLHttpRequest.prototype.open = function (m, u, ...r) { return O.call(this, m, String(u).includes('/api/courses') ? '/api/__falha_de_cursos' : u, ...r) }; return 'patched' })()"
```

Navegue **dentro da SPA** (cliques, nunca `goto`) até Comercial → um orçamento com cotação, e meça:

```bash
playwright-cli find "Revisa tu conexión"     # aviso do card de cotações
playwright-cli find "Reintentar"
playwright-cli snapshot                       # as linhas de cotação seguem na tela
```

Esperado: aviso presente **e** as cotações visíveis (valor UF e estado de cada uma). Depois abra o
wizard pelo botão de nova cotação:

```bash
playwright-cli find "No se pudieron cargar los datos"
```

Esperado: o passo 1 mostra a falha com Reintentar — **não** uma lista vazia.

- [ ] **Step 6: Prova A′ — o caminho de volta**

```bash
playwright-cli eval "window.__unpatch()"
playwright-cli click e<ref-do-Reintentar-do-wizard>
playwright-cli snapshot
```

Esperado: a lista de cursos aparece, a mensagem de falha some. Feche o wizard e confira que o aviso
do card também sumiu (o Reintentar recarrega a mesma query).

- [ ] **Step 7: Prova B — catálogo vazio de verdade**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan tinker --execute="\App\Domains\Catalog\Models\Course::query()->delete(); echo \App\Domains\Catalog\Models\Course::count();"
```

Esperado: `0`. No navegador, recarregue, abra o wizard de nova cotação e meça:

```bash
playwright-cli reload
playwright-cli find "No hay cursos."
playwright-cli find "No se pudieron cargar"
```

Esperado: a primeira busca **acha**, a segunda **não acha nada** — vazio de verdade e falha
continuam distinguíveis, que é o bloco inteiro em uma medição.

Restaure imediatamente. Se o Step 3 mediu `trashed=0`:

```bash
docker compose exec -T app php artisan tinker --execute="\App\Domains\Catalog\Models\Course::onlyTrashed()->restore(); echo 'vivos=' . \App\Domains\Catalog\Models\Course::count();"
```

Se mediu `trashed>0`, restaure só os que este passo apagou (os de hoje):

```bash
docker compose exec -T app php artisan tinker --execute="\App\Domains\Catalog\Models\Course::onlyTrashed()->whereDate('deleted_at', today())->restore(); echo 'vivos=' . \App\Domains\Catalog\Models\Course::count() . ' trashed=' . \App\Domains\Catalog\Models\Course::onlyTrashed()->count();"
```

Esperado: os dois números de volta ao que o Step 3 anotou.

- [ ] **Step 8: Prova C — GET de clientes falhando no create de orçamento**

```bash
playwright-cli eval "(() => { const O = XMLHttpRequest.prototype.open; window.__unpatch = () => { XMLHttpRequest.prototype.open = O; return 'restored' }; XMLHttpRequest.prototype.open = function (m, u, ...r) { return O.call(this, m, String(u).includes('/api/clients') ? '/api/__falha_de_clientes' : u, ...r) }; return 'patched' })()"
```

Navegue pela SPA até a lista de orçamentos e abra o diálogo de novo orçamento:

```bash
playwright-cli find "Revisa tu conexión"
playwright-cli eval "el => el.className" e<ref-do-dropdown>
```

Esperado: o motivo na tela com Reintentar, e o dropdown **desabilitado** (`p-disabled` na classe).

**E a outra metade da §7.3 se mede aqui, no mesmo patch:** a tabela de orçamentos ao fundo mostra o
próprio estado de erro com Reintentar, como sempre mostrou (D16) — é a prova de que as quatro chaves
novas do `useCommercialClients` são **aditivas** e não mudaram o consumidor antigo. Comportamento
esperado, não achado.

- [ ] **Step 9: Prova D — a não-regressão do retrofit (spec §7.3)**

Com o patch de clientes ainda de pé, navegue até Pessoas → Alunos e abra o diálogo de novo aluno:

```bash
playwright-cli find "Revisa tu conexión"
playwright-cli find "Reintentar"
```

Esperado: o dropdown de empresa do aluno segue mostrando motivo e Reintentar — a Task 2 trocou o
mecanismo sem trocar o comportamento. Depois:

```bash
playwright-cli eval "window.__unpatch()"
playwright-cli close
```

- [ ] **Step 10: Árvore limpa e evidência registrada**

```bash
cd /home/jvbat/projetos/lotus && git status --porcelain
```

Esperado: **vazio** — nenhum arquivo de prova materializado no repositório. Registre em
`.superpowers/sdd/progress.md` o que cada prova mediu, com os números do Step 1 e do Step 3.

---

## Handoff de execução

**executor: claude**

Sem `paths_autorizados`. O bloco muda comportamento de propósito em três telas, atravessa a fronteira
de módulo (o retrofit toca `identity`), decide granularidade de estado com julgamento (o que é
"vazio de verdade" contra "termo sem resultado") e o gate mexe no **banco de dev** com passo de
restauração — nada disso é mecânico com verificação fechada.

**Conflito conhecido, declarado antes de acontecer:** o cabeçalho deste plano pede
`subagent-driven-development`, e esta sessão tem regra de não chamar o Agent tool sem pedido — o
mesmo impasse do BD-4, do `rastro-unicidade-e-gates` e do login. Resolve-se no `/executar-bloco`, por
pergunta direta ao João, não aqui.
