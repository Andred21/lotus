# BD-18 · `useLoadState`: a promise, a forma e os dois ramos crus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A política "falhou vs. veio vazia" e o contrato Q-14 (o retry devolve a promise que o botão aguarda) passam a nascer num lugar só, e os dois últimos consumidores que ramificam por `isError` cru param de apagar cache utilizável.

**Architecture:** Uma peça nova em `shared/hooks/listSource.ts` com duas exportações — `loadFailure(query)` (a política) e `listSource(query)` (a forma de página inteira). Os 12 sítios que hoje escrevem a política à mão passam a espalhá-la; os 14 produtores que fazem `void query.refetch()` passam a devolver a promise; o `InlineLoadState` ganha a espera que o `AppErrorState` já tinha, extraída para peça única; e `RedatorCourseSelector`/`CourseRedatoresSection` trocam `isError` por `failedWithoutData`, com aviso ao lado da lista quando há cache.

**Tech Stack:** React 19 + TypeScript, TanStack Query v5 (`@tanstack/query-core@5.101.1`), Vitest + Testing Library (jsdom), PrimeReact via `shared/ui`, i18next.

## Global Constraints

- **Frontend puro.** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` deve devolver **zero arquivo** no fechamento. Pint, `php artisan test` e `typescript:transform` ficam N/A por escopo medido.
- Todos os comandos rodam de `frontend/`: `pnpm test`, `pnpm lint`, `pnpm build`.
- **Baseline medida em `93acf6a7`, antes da Task 1:** `pnpm test` = **81 arquivos / 453 testes**, verde; `pnpm lint` exit 0; `pnpm build` verde. Nenhuma task pode reduzir a contagem.
- **Lei §5.6:** feature não importa PrimeReact direto nem outra feature. Nada neste plano cria import cruzado.
- **`shared/lib` não importa `@tanstack` nem `@shared/api`** — fronteira registrada em `archivable.ts:18-22`, `screenDetail.ts:23-27` e `AppDataTable.tsx:16-18`. É por isso que a peça nova mora em `shared/hooks`, e não ao lado do irmão `archivableSource`.
- Um commit por task, na ordem do plano.
- Comentário e docblock em **português**, como todo o repositório. Chave i18n nunca crua na tela.

---

## Mapa de arquivos

**Cria:**
- `src/shared/hooks/listSource.ts` — `loadFailure` (a política) e `listSource` (a forma de página).
- `src/shared/hooks/listSource.test.ts` — catraca das duas.
- `src/shared/ui/AppErrorState/useRetryPending.ts` — a espera do retry, compartilhada por `AppErrorState` e `InlineLoadState`.
- `src/shared/ui/InlineLoadState/InlineLoadState.test.tsx` — catraca do botão em carga.
- `src/features/identity/components/Redator/RedatorCourseSelector.test.tsx` — o ramo com cache.
- `src/features/catalog/components/Course/CourseRedatoresSection.test.tsx` — o ramo com cache, nos dois modos.

**Modifica:** `useCrudPage.ts`, `useArchivedPage.ts`, `useTurmasPage.ts`, `usePendingQuotesPage.ts`, `useLoadState.ts`, `useResourceState.ts`, `useTurmaDetail.ts`, `useRedatorPicker.ts`, `useEnrollmentSection.ts`, `useTurmaDocsSection.ts`, `useBudgetDetail.ts`, `useHistorial.ts`, `useEmissionPanelState.ts`, `useValidationPage.ts`, `useDashboard.ts`, `StudentClientField.tsx`, `AppErrorState.tsx`, `InlineLoadState.tsx`, `RedatorCourseSelector.tsx`, `CourseRedatoresSection.tsx`, `shared/hooks/index.ts`, `useLoadState.test.ts`, `useResourceState.test.ts`, `.claude/rules/frontend-fsliced.md`.

---

### Task 1: A peça — `loadFailure` e `listSource`

**Files:**
- Create: `frontend/src/shared/hooks/listSource.ts`
- Create: `frontend/src/shared/hooks/listSource.test.ts`
- Modify: `frontend/src/shared/hooks/index.ts`

**Interfaces:**
- Consumes: `ListSource<T>` de `@shared/lib` (já existe, `shared/lib/archivable.ts:28`), `ProblemDetails` de `@shared/api/axios`, `UseQueryResult` de `@tanstack/react-query`.
- Produces: `loadFailure(query: { isError: boolean; error: ProblemDetails | null }): ProblemDetails | null` e `listSource<T>(query: UseQueryResult<T[], ProblemDetails>): ListSource<T>`. **Todas as tasks seguintes consomem estes dois nomes, com estas assinaturas.**

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/shared/hooks/listSource.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { listSource, loadFailure } from './listSource'

type Item = { id: number }

/** O sentinela existe para provar IDENTIDADE: um `refetch` que devolvesse
 * `Promise.resolve()` passaria num `resolves.toBeDefined()` frouxo e a regressão
 * do Q-14 voltaria verde. */
const RESULTADO = { data: [{ id: 1 }] }

function query(
  over: Partial<Omit<UseQueryResult<Item[], ProblemDetails>, 'error'>> & {
    error?: ProblemDetails | null
  },
) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: () => Promise.resolve(RESULTADO),
    ...over,
  } as unknown as UseQueryResult<Item[], ProblemDetails>
}

describe('loadFailure — a política "falhou" vs. "veio vazia"', () => {
  it('devolve null em sucesso, INCLUSIVE com lista vazia', () => {
    expect(loadFailure(query({ isSuccess: true, data: [] }))).toBeNull()
  })

  it('devolve o envelope quando a query falhou', () => {
    const problema = { detail: 'Sin conexión', localDetail: true } as ProblemDetails

    expect(loadFailure(query({ isError: true, error: problema }))).toBe(problema)
  })

  it('devolve {} quando isError sem corpo — falha que null esconderia', () => {
    expect(loadFailure(query({ isError: true, error: null }))).toEqual({})
  })
})

describe('listSource — a forma normalizada de lista', () => {
  it('items é [] quando não há dado, e a falha vem de loadFailure', () => {
    const source = listSource(query({ isError: true, error: null, isLoading: false }))

    expect(source.items).toEqual([])
    expect(source.error).toEqual({})
    expect(source.loading).toBe(false)
  })

  it('DEVOLVE a promise do refetch (contrato Q-14)', async () => {
    const source = listSource(query({ isSuccess: true, data: [{ id: 1 }] }))

    await expect(source.refetch()).resolves.toBe(RESULTADO)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test listSource
```
Esperado: FAIL — `Failed to resolve import "./listSource"`.

- [ ] **Step 3: Escrever a peça**

Crie `frontend/src/shared/hooks/listSource.ts`:

```ts
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import type { ListSource } from '@shared/lib'

/**
 * A política "falhou" vs. "veio vazia", num lugar só.
 *
 * `{}` quando o interceptor não populou o corpo: `isError` sem `error` ainda é
 * falha, e devolver `null` a esconderia. `null` em sucesso, inclusive com lista
 * vazia — vazio não é erro (spec D16).
 *
 * O parâmetro é estrutural, e não `UseQueryResult`, de propósito: a política lê
 * dois campos, e exigir a forma do DADO a impediria de servir o
 * `useResourceState`, que é `UseQueryResult<T, …>` de recurso único.
 */
export function loadFailure(query: {
  isError: boolean
  error: ProblemDetails | null
}): ProblemDetails | null {
  return query.isError ? (query.error ?? ({} as ProblemDetails)) : null
}

/**
 * A forma normalizada de uma lista de página, montada num lugar só.
 *
 * O par `error` + `refetch` estava escrito por extenso em 12 sítios, e a
 * política já tinha divergido uma vez (Q-1/Q-1b/Q-2 do review de 2026-08-14).
 * O `refetch` DEVOLVE a promise: é ela que o `AppErrorState` aguarda para manter
 * o "Reintentar" em `loading` enquanto o GET está em voo (Q-14) — e o tipo de
 * retorno `ListSource<T>` é o que obriga a isso, porque TypeScript aceita
 * descartar retorno e não veria o `void` voltar.
 *
 * Função pura, não hook — o mesmo critério do `archivableSource`. Mora em
 * `shared/hooks` mesmo assim, e não ao lado dele: precisa de `UseQueryResult` e
 * de `ProblemDetails`, e `shared/lib` não importa `@tanstack` nem `@shared/api`
 * (`archivable.ts:18-22`, `screenDetail.ts:23-27`, `AppDataTable.tsx:16-18`).
 */
export function listSource<T>(query: UseQueryResult<T[], ProblemDetails>): ListSource<T> {
  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: loadFailure(query),
    refetch: () => query.refetch(),
  }
}
```

- [ ] **Step 4: Exportar pelo barrel**

Em `frontend/src/shared/hooks/index.ts`, depois da linha `export { useLoadState } from './useLoadState'` (`:22`), insira:

```ts
export { listSource, loadFailure } from './listSource'
```

- [ ] **Step 5: Rodar até passar**

```bash
cd frontend && pnpm test listSource && pnpm build
```
Esperado: 5 testes passando; build verde.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/hooks/listSource.ts frontend/src/shared/hooks/listSource.test.ts frontend/src/shared/hooks/index.ts
git commit -m "feat(shared): listSource e loadFailure, a forma de lista num lugar so"
```

---

### Task 2: `useCrudPage` e `useArchivedPage` espalham

**Files:**
- Modify: `frontend/src/shared/hooks/useCrudPage.ts:56-61`
- Modify: `frontend/src/shared/hooks/useArchivedPage.ts:73-83`

**Interfaces:**
- Consumes: `listSource` da Task 1.
- Produces: nada novo. As duas saídas seguem com `items`, `loading`, `error`, `refetch` — nenhum consumidor muda.

- [ ] **Step 1: `useCrudPage`**

Em `frontend/src/shared/hooks/useCrudPage.ts`, troque o bloco `items`/`loading`/`error`/`refetch` do `return` (linhas 51-61, do `items,` até `refetch: () => query.refetch(),`) por:

```ts
    ...listSource(query),
```

Adicione o import no topo:

```ts
import { listSource } from './listSource'
```

`items` continua declarado acima (`const items = query.data ?? []`) porque o `entity` do dialog o usa — o spread apenas para de repetir a derivação na saída. Se o `import type { ProblemDetails }` ficar sem uso, remova-o; o `pnpm lint` reprova import morto.

- [ ] **Step 2: `useArchivedPage`**

Em `frontend/src/shared/hooks/useArchivedPage.ts`, troque as linhas do `return` que declaram `items`, `loading`, `error` e `refetch` (`:76-83`) por:

```ts
    ...listSource(query),
    // O `items` do `listSource` é `query.data ?? []`; o desta tela carrega o
    // rastro de arquivamento e vem memoizado acima. O override vem DEPOIS do
    // spread de propósito — invertê-los devolveria a linha sem `archived_at`.
    items,
```

Import no topo, junto dos outros de `shared/hooks` locais:

```ts
import { listSource } from "./listSource";
```

> Este arquivo usa aspas duplas e ponto-e-vírgula. Siga o estilo do arquivo, não o dos vizinhos.

- [ ] **Step 3: Provar que nada mudou de comportamento**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```
Esperado: 81 arquivos / 453 testes verdes (baseline intacta), build verde, lint exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/hooks/useCrudPage.ts frontend/src/shared/hooks/useArchivedPage.ts
git commit -m "refactor(shared): useCrudPage e useArchivedPage espalham listSource"
```

---

### Task 3: Os dois aliases do BD-17 (D8)

**Files:**
- Modify: `frontend/src/features/operation/hooks/useTurmasPage.ts` (arquivo inteiro)
- Modify: `frontend/src/features/operation/hooks/usePendingQuotesPage.ts` (arquivo inteiro)

**Interfaces:**
- Consumes: `listSource` da Task 1.
- Produces: as mesmas quatro chaves de antes. `OperationPage`, `TurmasTable` e `PendingQuotesPanel` não mudam.

- [ ] **Step 1: `useTurmasPage`**

Substitua `frontend/src/features/operation/hooks/useTurmasPage.ts` inteiro por:

```ts
import { listSource } from '@shared/hooks'
import { useTurmas } from '../api/useTurmas'

/**
 * O alias de página das turmas, no molde dos 7 `useXPage` que já existem — não é
 * delegação vazia, é o que mantém a query fora do componente. O irmão dele, o
 * `usePendingQuotesPage`, mora em arquivo próprio.
 *
 * O que estes dois acrescentam aos outros sete: `useTurmas.ts` é artesanal e não
 * passa pela fábrica `createCrudResource`, então devolve `UseQueryResult` cru. Era
 * a assimetria que fazia a `OperationPage` ser a ÚNICA a derivar o estado de carga
 * à mão, em ternário aninhado dentro da prop:
 *
 *     error={archived ? turmasArchived.error : turmas.isError ? (turmas.error ?? {}) : null}
 *
 * Nasceram derivando à mão porque o `useLoadState` de então engolia a promise do
 * `refetch` (Q-14 · D-54). Pago o débito, a derivação some: o `listSource` é a
 * home única da forma, e o contrato da promise vem do tipo dele.
 */
export function useTurmasPage() {
  return listSource(useTurmas())
}
```

- [ ] **Step 2: `usePendingQuotesPage`**

Substitua `frontend/src/features/operation/hooks/usePendingQuotesPage.ts` inteiro por:

```ts
import { listSource } from '@shared/hooks'
import { usePendingQuotes } from '../api/useTurmas'

/**
 * A fila de cotizações pendentes de configuração, na mesma forma normalizada do
 * `useTurmasPage` — arquivo próprio porque a convenção dos outros 7 aliases
 * `useXPage` é um hook por arquivo, com o nome do hook (Q-1 do review do BD-17).
 *
 * Não é superfície de arquivados — alimenta o `PendingQuotesPanel` —, mas
 * carregava o MESMO `isError ? (error ?? {}) : null` cru dentro da prop
 * (`OperationPage:31` antes do BD-17), e a ficha do D-52 o nomeia.
 */
export function usePendingQuotesPage() {
  return listSource(usePendingQuotes())
}
```

- [ ] **Step 3: As catracas dos dois seguem valendo**

```bash
cd frontend && pnpm test useTurmasPage usePendingQuotesPage
```
Esperado: PASS, incluindo os dois testes "DEVOLVE a promise do refetch" (`useTurmasPage.test.tsx:69`, `usePendingQuotesPage.test.tsx:53`) — eles nasceram como guarda do D4 do BD-17 e agora guardam o `listSource`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/operation/hooks/useTurmasPage.ts frontend/src/features/operation/hooks/usePendingQuotesPage.ts
git commit -m "refactor(operation): os dois aliases espalham listSource"
```

---

### Task 4: `useLoadState` e `useResourceState` — a política e a promise

**Files:**
- Modify: `frontend/src/shared/hooks/useLoadState.ts:39,51-53`
- Modify: `frontend/src/shared/hooks/useResourceState.ts:35,40-42`
- Modify: `frontend/src/shared/hooks/useLoadState.test.ts`
- Modify: `frontend/src/shared/hooks/useResourceState.test.ts`

**Interfaces:**
- Consumes: `loadFailure` da Task 1.
- Produces: `useLoadState(...).refetch` e `useResourceState(...).refetch` passam a `() => Promise<unknown>`. Os 7 consumidores não mudam — TypeScript aceita o retorno onde se espera `void`, que é exatamente o motivo de a catraca existir.

- [ ] **Step 1: Escrever as duas catracas antes da correção**

Em `frontend/src/shared/hooks/useLoadState.test.ts`, troque a linha `refetch: () => Promise.resolve(),` do stub por `refetch: () => Promise.resolve(RESULTADO),` e declare acima do `function query(`:

```ts
/** Sentinela de identidade: `Promise.resolve()` passaria num `toBeDefined()`
 * frouxo, e o `void` que o D-54 removeu voltaria verde. */
const RESULTADO = { data: [{ id: 1 }] }
```

Acrescente ao fim do arquivo:

```ts
describe('useLoadState — o contrato Q-14', () => {
  it('DEVOLVE a promise do refetch, com o resultado da query', async () => {
    const { result } = renderHook(() => useLoadState(query({ isSuccess: true, data: [] })))

    await expect(result.current.refetch()).resolves.toBe(RESULTADO)
  })
})
```

Repita o mesmo em `frontend/src/shared/hooks/useResourceState.test.ts` (o stub dele tem o mesmo formato), com o `describe` nomeado `useResourceState — o contrato Q-14` e `query({ isSuccess: true, data: { id: 1 } })`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test useLoadState useResourceState
```
Esperado: FAIL nos dois novos — `resolved to undefined` (o `void` descarta a promise e o corpo devolve `undefined`).

- [ ] **Step 3: Corrigir os dois hooks**

Em `frontend/src/shared/hooks/useLoadState.ts`, troque a linha `:39` por:

```ts
    loadError: loadFailure(query),
```

e as linhas `:51-53` por:

```ts
    /** DEVOLVE a promise: é ela que o `AppErrorState` aguarda para manter o
     * "Reintentar" em `loading` enquanto o GET está em voo (Q-14 · D-54).
     * Engoli-la com `void` não quebra tipo nem teste — por isso a catraca. */
    refetch: () => query.refetch(),
```

Ajuste os imports do topo: `loadFailure` entra por caminho relativo (`import { loadFailure } from './listSource'`), e `ProblemDetails` sai se ficar sem uso.

Faça o mesmo em `frontend/src/shared/hooks/useResourceState.ts` (`:35` e `:40-42`).

- [ ] **Step 4: Rodar até passar**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```
Esperado: baseline + 2 testes (455), build verde, lint 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/hooks/useLoadState.ts frontend/src/shared/hooks/useResourceState.ts frontend/src/shared/hooks/useLoadState.test.ts frontend/src/shared/hooks/useResourceState.test.ts
git commit -m "fix(shared): useLoadState e useResourceState devolvem a promise do refetch"
```

---

### Task 5: Os cinco hooks de feature que derivam a política

**Files:**
- Modify: `frontend/src/features/operation/hooks/useTurmaDetail.ts:17-18`
- Modify: `frontend/src/features/operation/hooks/useRedatorPicker.ts:33-34`
- Modify: `frontend/src/features/operation/hooks/useEnrollmentSection.ts:26-27`
- Modify: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts:55-56`
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts:87-94`

**Interfaces:**
- Consumes: `loadFailure` de `@shared/hooks` (Task 1).
- Produces: `reload`/`reloadList` passam a `() => Promise<unknown>`; `loadError` mantém tipo e valor. Os componentes (`TurmaDetailPage:61`, `RedatorDesignation:24`, `EnrollmentSection:76`, `TurmaDocuments:23`, `BudgetDetailPage:48`) não mudam — todos passam a função direto ao `onRetry` do `AppErrorState`, que já aceita `() => void | Promise<unknown>` (`AppErrorState.tsx:16`).

- [ ] **Step 1: Os quatro de `operation`**

Em cada um dos quatro, importe `loadFailure` de `@shared/hooks` e aplique:

`useTurmaDetail.ts` (`:17-18`):
```ts
    /** Falha do GET da turma — a tela precisa distinguir "não carregou" de
     * "não existe" (spec D16). */
    loadError: loadFailure(query),
    reload: () => query.refetch(),
```

`useRedatorPicker.ts` (`:33-34`) — preserve o docblock de `loadError` que já está lá e troque só as duas expressões:
```ts
    loadError: loadFailure(redatores),
    reloadList: () => redatores.refetch(),
```

`useEnrollmentSection.ts` (`:26-27`) — preserve o comentário acima:
```ts
    loadError: loadFailure(list),
    reload: () => list.refetch(),
```

`useTurmaDocsSection.ts` (`:55-56`):
```ts
    loadError: loadFailure(list),
    reload: () => list.refetch(),
```

Em cada arquivo, remova `import type { ProblemDetails }` se ficar sem uso.

- [ ] **Step 2: `useBudgetDetail`, que tem duas queries**

Em `frontend/src/features/commercial/hooks/useBudgetDetail.ts`, troque as linhas `:87-94` (do docblock de `loadError` até o `reload`) por:

```ts
    /** Falha do GET do orçamento ou do de clientes. Distinto de
     * `confirmError`/`fileError`, que são erros de mutação. */
    loadError: loadFailure(query) ?? loadFailure(clients),
    /** `Promise.all` e não duas chamadas soltas: o botão do `AppErrorState`
     * espera a promise devolvida, e devolver só a primeira o liberaria com a
     * segunda ainda em voo (Q-14). */
    reload: () => Promise.all([query.refetch(), clients.refetch()]),
```

Importe `loadFailure` de `@shared/hooks` e remova `import type { ProblemDetails }` se ficar sem uso.

> `loadFailure(query) ?? loadFailure(clients)` é equivalente ao ternário encadeado que sai: quando `query` falhou sem corpo o resultado é `{}`, que é truthy e não cai para o segundo ramo.

- [ ] **Step 3: Provar**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```
Esperado: 455 testes verdes, build verde, lint 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/operation/hooks/useTurmaDetail.ts frontend/src/features/operation/hooks/useRedatorPicker.ts frontend/src/features/operation/hooks/useEnrollmentSection.ts frontend/src/features/operation/hooks/useTurmaDocsSection.ts frontend/src/features/commercial/hooks/useBudgetDetail.ts
git commit -m "fix(features): cinco hooks param de derivar a politica e devolvem a promise"
```

---

### Task 6: O resto do D-54 — inclusive os três que travam por tipo

**Files:**
- Modify: `frontend/src/features/certification/hooks/useHistorial.ts:89,103,107`
- Modify: `frontend/src/features/certification/hooks/useEmissionPanelState.ts:82,85`
- Modify: `frontend/src/features/certification/hooks/useValidationPage.ts:9,30`
- Modify: `frontend/src/app/pages/Dashboard/useDashboard.ts:48,65,73,171-173`
- Modify: `frontend/src/features/identity/components/Student/StudentClientField.tsx:40`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `ValidationState` e `DashboardState` passam a declarar `retry: () => Promise<unknown>` e `staleRetry?: () => Promise<unknown>`; a prop `refetch` do `StudentClientField` passa a `() => void | Promise<unknown>`.

> **Estes cinco NÃO adotam `loadFailure`.** `useHistorial` e `useEmissionPanelState` escrevem `isError ? (error ?? null) : null`, que é outra política — devolve `null` onde a nossa devolve `{}`. Trocar mudaria comportamento de tela sem DoD que o cubra; ficam com a promise só. `useDashboard:185` já deriva dentro de um ramo onde `isError` é conhecido, e o comentário dele registra a escolha.

- [ ] **Step 1: Certificação — só o `void` sai**

`useHistorial.ts`:
```ts
    reload: () => certificates.refetch(),
    // …
    reloadViewingCertificate: () => viewingCertificate.refetch(),
    // …
    reissuePanelReload: () => panel.refetch(),
```

`useEmissionPanelState.ts`:
```ts
    reloadViewingCertificate: () => viewingCertificate.refetch(),
    // …
    reload: () => panel.refetch(),
```

- [ ] **Step 2: `useValidationPage` — corpo E assinatura**

Em `frontend/src/features/certification/hooks/useValidationPage.ts`, linha `:9`:

```ts
  | { kind: 'error'; error: ProblemDetails; retry: () => Promise<unknown> }
```

e linha `:30`:

```ts
    return { kind: 'error', error: query.error, retry: () => query.refetch() }
```

- [ ] **Step 3: `useDashboard` — corpo E as três declarações**

Em `frontend/src/app/pages/Dashboard/useDashboard.ts`, linha `:48`:

```ts
  | { kind: 'error'; error: ProblemDetails; retry: () => Promise<unknown> }
```

nas duas variantes `ready` (`:65` e `:73`), a declaração de `staleRetry`, preservando o docblock que está sobre a primeira:

```ts
      staleRetry?: () => Promise<unknown>
```

e o corpo (`:171-173`):

```ts
  const retry = () => query.refetch()
```

- [ ] **Step 4: `StudentClientField` — a prop**

Em `frontend/src/features/identity/components/Student/StudentClientField.tsx`, linha `:40`:

```ts
  /** Aceita a promise do `useLoadState`: é ela que mantém o botão em carga
   * (Q-14). Molde: `QuotesList.tsx:26`. */
  refetch: () => void | Promise<unknown>;
```

> Este arquivo usa aspas duplas e ponto-e-vírgula. Siga o estilo dele.

- [ ] **Step 5: Provar**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```
Esperado: 455 verdes, build verde (é o `pnpm build` que prova as três assinaturas novas — `pnpm test` não olha tipo), lint 0.

- [ ] **Step 6: Verificar que a varredura fechou**

```bash
cd frontend && grep -rn "void .*\.refetch()" src --include=*.ts --include=*.tsx | grep -v "\.test\."
```
Esperado: **nenhuma linha**. Se alguma sobrar, ela é do escopo desta task.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/certification/hooks/useHistorial.ts frontend/src/features/certification/hooks/useEmissionPanelState.ts frontend/src/features/certification/hooks/useValidationPage.ts frontend/src/app/pages/Dashboard/useDashboard.ts frontend/src/features/identity/components/Student/StudentClientField.tsx
git commit -m "fix(features): os ultimos sete refetch devolvem a promise, tipo incluido"
```

---

### Task 7: A espera do retry, compartilhada — `InlineLoadState` ganha carga

**Files:**
- Create: `frontend/src/shared/ui/AppErrorState/useRetryPending.ts`
- Create: `frontend/src/shared/ui/InlineLoadState/InlineLoadState.test.tsx`
- Modify: `frontend/src/shared/ui/AppErrorState/AppErrorState.tsx:29-40,49-60`
- Modify: `frontend/src/shared/ui/InlineLoadState/InlineLoadState.tsx:17,36,44,53`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `useRetryPending(onRetry?: () => void | Promise<unknown>): { pending: boolean; run: () => void }`. Consumido por `AppErrorState` e `InlineLoadState`, por caminho relativo — **não sai pelo barrel** de `shared/ui`, mesmo precedente de `useArchiveToasts` (`shared/hooks/index.ts:11-13`).
- `InlineLoadStateProps.onRetry` passa a `() => void | Promise<unknown>`. Os 12 usos em 9 arquivos não mudam.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/shared/ui/InlineLoadState/InlineLoadState.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InlineLoadState } from './InlineLoadState'

afterEach(() => {
  cleanup()
})

/** Uma promise que só resolve quando o teste mandar — é o que permite observar o
 * botão DURANTE o voo do GET, e não depois. */
function promiseControlada() {
  let resolve!: (v: unknown) => void
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('InlineLoadState — o Reintentar espera a promise (Q-14)', () => {
  it('fica em carga enquanto a promise está pendente, e volta quando resolve', async () => {
    const { promise, resolve } = promiseControlada()
    render(
      <InlineLoadState error="Sin conexión" retryLabel="Reintentar" onRetry={() => promise} />,
    )

    const botao = screen.getByRole('button', { name: 'Reintentar' }) as HTMLButtonElement
    fireEvent.click(botao)

    await waitFor(() => expect(botao.disabled).toBe(true))

    resolve(undefined)

    await waitFor(() => expect(botao.disabled).toBe(false))
  })

  it('handler que devolve void continua funcionando', async () => {
    let chamadas = 0
    render(
      <InlineLoadState
        error="Sin conexión"
        retryLabel="Reintentar"
        onRetry={() => {
          chamadas += 1
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(chamadas).toBe(1))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test InlineLoadState
```
Esperado: FAIL no primeiro teste — o botão nunca fica `disabled`.

- [ ] **Step 3: Extrair a espera**

Crie `frontend/src/shared/ui/AppErrorState/useRetryPending.ts`:

```ts
import { useState } from 'react'

/**
 * A espera do "Reintentar": mantém o botão em carga enquanto a promise do
 * refetch está em voo, e ignora clique repetido no meio (Q-14).
 *
 * Mora aqui e é consumido por caminho relativo pelos DOIS componentes de falha
 * (`AppErrorState` e `InlineLoadState`). Copiar o `try/finally` no segundo seria
 * a mesma política em dois arquivos — que é o defeito que o D-56 fechou um andar
 * abaixo. Não sai pelo barrel: é mecanismo interno, não superfície pública
 * (mesmo precedente de `useArchiveToasts`).
 *
 * Handler que devolve `void` continua funcionando — só fica sem feedback, e isso
 * está declarado como limitação, não como bug.
 */
export function useRetryPending(onRetry?: () => void | Promise<unknown>) {
  const [pending, setPending] = useState(false)

  const run = () => {
    if (pending) return
    setPending(true)
    void (async () => {
      try {
        await onRetry?.()
      } finally {
        setPending(false)
      }
    })()
  }

  return { pending, run }
}
```

- [ ] **Step 4: `AppErrorState` consome**

Em `frontend/src/shared/ui/AppErrorState/AppErrorState.tsx`, remova o `useState`, o `retrying` e o `handleRetry` (`:1,30-40`) e use:

```tsx
export function AppErrorState({ title, detail, retryLabel, onRetry }: AppErrorStateProps) {
  const retry = useRetryPending(onRetry)
```

no botão (`:51-58`):

```tsx
          <AppButton
            label={retryLabel}
            icon="pi pi-refresh"
            outlined
            loading={retry.pending}
            disabled={retry.pending}
            onClick={retry.run}
          />
```

Import: `import { useRetryPending } from './useRetryPending'`.

- [ ] **Step 5: `InlineLoadState` consome**

Em `frontend/src/shared/ui/InlineLoadState/InlineLoadState.tsx`, a prop (`:13-17`):

```tsx
  /** Ausente => a linha explica e não oferece botão. Existe porque repetir NEM
   * SEMPRE é recuperação: numa recusa de validação (422) o "Reintentar" reemite
   * a mesma requisição e recebe a mesma recusa, e a correção está no controle ao
   * lado, que a própria mensagem já indica (UI-05 da revisão de 2026-08-17).
   *
   * Aceita promise: com ela o botão espera o GET em voo, como o do
   * `AppErrorState` (Q-14). */
  onRetry?: () => void | Promise<unknown>
```

no corpo, logo depois da guarda `if (!error && !emptyHint) return null`:

```tsx
  const retry = useRetryPending(onRetry)
```

e nos dois botões (`:44` e `:53`), no lugar de `onClick={onRetry}`:

```tsx
          <AppButton label={retryLabel} text loading={retry.pending} disabled={retry.pending} onClick={retry.run} />
```

Import: `import { useRetryPending } from '../AppErrorState/useRetryPending'`.

> **Atenção à ordem dos hooks:** o `return null` da guarda está ANTES da chamada. Mova a chamada de `useRetryPending` para cima da guarda — hook depois de `return` condicional é `react-hooks/rules-of-hooks`, e o `pnpm lint` reprova.

- [ ] **Step 6: Rodar até passar**

```bash
cd frontend && pnpm test && pnpm lint && pnpm build
```
Esperado: baseline + 4 (457), lint 0, build verde.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/AppErrorState/ frontend/src/shared/ui/InlineLoadState/
git commit -m "feat(shared/ui): InlineLoadState espera a promise do Reintentar"
```

---

### Task 8: D-14 — `RedatorCourseSelector`

**Files:**
- Create: `frontend/src/features/identity/components/Redator/RedatorCourseSelector.test.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx:2,26-47,74-85`

**Interfaces:**
- Consumes: `failedWithoutData`, `isError`, `errorDetail`, `errorHint`, `refetch` de `useRedatorCourses` (que espalha `useLoadState`, Task 4).
- Produces: nada.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/features/identity/components/Redator/RedatorCourseSelector.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CourseData } from '@shared/types/generated'
import type { useRedatorCourses } from '../../hooks/useRedatorCourses'
import { RedatorCourseSelector } from './RedatorCourseSelector'

/** `t` devolve a chave: o que se prova é QUAL ramo a tela mostra, não o texto
 * traduzido (isso é do `parity.test.ts`). Molde: `CourseStep.test.tsx`. */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

type Courses = ReturnType<typeof useRedatorCourses>

const CURSO = { id: 1, name: 'Alta tensión', workload_hours: 8 } as CourseData

const base = {
  data: [CURSO],
  enabledCourses: [CURSO],
  orderedCourses: [CURSO],
  isLoading: false,
  isError: false,
  errorDetail: undefined,
  errorHint: 'common.loadErrorHint',
  loadError: null,
  refetch: () => Promise.resolve(),
  isEmpty: false,
  unusable: false,
  failedWithoutData: false,
} as unknown as Courses

let atual: Courses = base
vi.mock('../../hooks/useRedatorCourses', () => ({
  useRedatorCourses: () => atual,
}))

const renderSelector = (over: Partial<Courses>, readOnly = false) => {
  atual = { ...base, ...over } as Courses
  return render(
    <RedatorCourseSelector courseIds={[1]} readOnly={readOnly} onToggle={() => {}} orderKey="1:edit" />,
  )
}

afterEach(() => {
  cleanup()
  atual = base
})

describe('RedatorCourseSelector — falha COM cache não apaga a lista', () => {
  it('falha SEM cache: o erro substitui a seção', () => {
    renderSelector({
      isError: true, failedWithoutData: true, unusable: true, errorDetail: 'Sin conexión',
      data: [], enabledCourses: [], orderedCourses: [],
    })

    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(screen.queryByText('Alta tensión')).toBeNull()
  })

  it('falha COM cache: a lista PERMANECE e o aviso vai ao lado', () => {
    // O caso que forçar `orderedCourses: []` no teste esconderia — foi assim que
    // a regressão do BD-6 passou verde.
    renderSelector({ isError: true, failedWithoutData: false, errorDetail: 'Sin conexión' })

    expect(screen.getByText('Alta tensión')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test RedatorCourseSelector
```
Esperado: FAIL no segundo teste — hoje `isError` cru substitui a seção, então `Alta tensión` não está na tela.

- [ ] **Step 3: Corrigir o componente**

Em `frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx`, a guarda (`:38`):

```tsx
  // A falha SUBSTITUI a seção só quando não há catálogo em cache. Com cache em
  // mão, um refetch falho mantém `data` populado enquanto `status` vira `error`:
  // gatear por `isError` cru apagava uma lista utilizável e a seleção já feita
  // (rule `frontend-fsliced.md`, precedente `CourseStep.tsx:46`).
  if (courses.failedWithoutData) {
```

e o `return` final (`:74-85`), envolvendo o grid:

```tsx
  return (
    <div className="space-y-2">
      <InlineLoadState
        error={courses.isError ? (courses.errorDetail ?? t(courses.errorHint)) : null}
        retryLabel={t('common.retry')}
        onRetry={courses.refetch}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {courses.orderedCourses.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            selected={courseIds.includes(c.id as number)}
            onToggle={() => onToggle(c.id as number)}
          />
        ))}
      </div>
    </div>
  )
```

O mesmo aviso entra no ramo `readOnly` (`:57-72`), envolvendo o grid de `enabledCourses` da mesma forma — a lista é a mesma nos dois modos.

Import: acrescente `InlineLoadState` ao import de `@shared/ui` (`:2`).

- [ ] **Step 4: Rodar até passar**

```bash
cd frontend && pnpm test RedatorCourseSelector && pnpm lint && pnpm build
```
Esperado: 2 testes verdes, lint 0, build verde.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx frontend/src/features/identity/components/Redator/RedatorCourseSelector.test.tsx
git commit -m "fix(identity): falha com cache mantem a lista de cursos do redator"
```

---

### Task 9: D-14 — `CourseRedatoresSection`

**Files:**
- Create: `frontend/src/features/catalog/components/Course/CourseRedatoresSection.test.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CourseRedatoresSection.tsx:2,23-34,35-51,52-73`

**Interfaces:**
- Consumes: `failedWithoutData`, `isError`, `errorDetail`, `errorHint`, `refetch` de `useCourseRedatores` (Task 4).
- Produces: nada.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/features/catalog/components/Course/CourseRedatoresSection.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { RedatorData } from '@shared/types/generated'
import type { useCourseRedatores } from '../../hooks/useCourseRedatores'
import { CourseRedatoresSection } from './CourseRedatoresSection'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

type Redatores = ReturnType<typeof useCourseRedatores>

const REDATOR = { id: 7, name: 'Ana Silva' } as RedatorData

const base = {
  data: [REDATOR],
  allRedatores: [REDATOR],
  enabledRedatores: [REDATOR],
  isLoading: false,
  isError: false,
  errorDetail: undefined,
  errorHint: 'common.loadErrorHint',
  loadError: null,
  refetch: () => Promise.resolve(),
  isEmpty: false,
  unusable: false,
  failedWithoutData: false,
  canOpenRedator: false,
  openRedator: () => {},
} as unknown as Redatores

const renderSection = (over: Partial<Redatores>, isCreate = false) =>
  render(
    <CourseRedatoresSection
      redatores={{ ...base, ...over } as Redatores}
      isCreate={isCreate}
      enabledIds={[7]}
      onToggle={() => {}}
    />,
  )

afterEach(() => {
  cleanup()
})

describe('CourseRedatoresSection — falha COM cache não apaga a lista', () => {
  it('falha SEM cache: o erro substitui a seção', () => {
    renderSection({
      isError: true, failedWithoutData: true, unusable: true, errorDetail: 'Sin conexión',
      data: [], allRedatores: [], enabledRedatores: [],
    })

    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(screen.queryByText('Ana Silva')).toBeNull()
  })

  it('falha COM cache no modo leitura: a lista PERMANECE e o aviso vai ao lado', () => {
    renderSection({ isError: true, failedWithoutData: false, errorDetail: 'Sin conexión' })

    expect(screen.getByText('Ana Silva')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })

  it('falha COM cache no modo cadastro: idem — os dois ramos finais avisam', () => {
    renderSection({ isError: true, failedWithoutData: false, errorDetail: 'Sin conexión' }, true)

    expect(screen.getByText('Ana Silva')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test CourseRedatoresSection
```
Esperado: FAIL no segundo e no terceiro teste.

- [ ] **Step 3: Corrigir o componente**

Em `frontend/src/features/catalog/components/Course/CourseRedatoresSection.tsx`, o ramo de falha (`:28`) vira `redatores.failedWithoutData ? (`, e o aviso entra nos **dois** ramos finais. Declare o elemento uma vez, antes do `return`:

```tsx
  // A falha só substitui a seção sem cache; com lista em mão ela vira aviso ao
  // lado, e a seção segue utilizável (rule `frontend-fsliced.md`, precedente
  // `CourseStep.tsx:76`). Declarado uma vez: os dois ramos finais o imprimem, e
  // cobrir só um deixaria metade do defeito de pé.
  const aviso = (
    <InlineLoadState
      error={redatores.isError ? (redatores.errorDetail ?? t(redatores.errorHint)) : null}
      retryLabel={t('common.retry')}
      onRetry={redatores.refetch}
    />
  )
```

No ramo `isCreate` (`:35-51`), logo depois de `<div className="space-y-2">`, insira `{aviso}`. No ramo view/edit (`:52-73`), idem.

Import: acrescente `InlineLoadState` ao import de `@shared/ui` (`:2`).

- [ ] **Step 4: Rodar até passar**

```bash
cd frontend && pnpm test CourseRedatoresSection && pnpm lint && pnpm build
```
Esperado: 3 testes verdes, lint 0, build verde.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CourseRedatoresSection.tsx frontend/src/features/catalog/components/Course/CourseRedatoresSection.test.tsx
git commit -m "fix(catalog): falha com cache mantem a lista de redatores do curso"
```

---

### Task 10: A rule e o gate

**Files:**
- Modify: `.claude/rules/frontend-fsliced.md:141-150`

**Interfaces:**
- Consumes: o estado final de todas as tasks anteriores.
- Produces: nada de código.

> A linha da rule entra **agora**, e não antes: escrevê-la com sítios ainda derivando à mão a tornaria falsa no próprio commit que a cria (D7).

- [ ] **Step 1: Provar que o último sítio foi zerado**

```bash
cd frontend
grep -rn "isError ? (.*?? ({} as" src --include=*.ts --include=*.tsx | grep -v "\.test\." | grep -v "shared/hooks/listSource.ts"
grep -rn "void .*\.refetch()" src --include=*.ts --include=*.tsx | grep -v "\.test\."
```
Esperado: **nenhuma linha nos dois**. Qualquer sobra volta para a task dona antes de a rule ser escrita.

- [ ] **Step 2: Escrever a rule**

Em `.claude/rules/frontend-fsliced.md`, ao fim do bullet que começa em `:141` (**"O que ramifica a tela é o DADO que falta…"**), depois da frase que termina em `(Q-1, Q-1b e Q-2 do review de 2026-08-14).`, acrescente:

```markdown
  A forma normalizada de lista é `ListSource<T>` e nasce num lugar só
  (`shared/hooks/listSource.ts`). Hook que monta `isError ? (error ?? {}) : null` à mão está
  recriando a política — o alias espalha, não deriva. E **retry devolve a promise**: é ela que
  mantém o "Reintentar" em `loading` enquanto o GET está em voo (Q-14), e `void query.refetch()`
  a engole **sem quebrar tipo nem teste** — TypeScript aceita descartar retorno, então quem
  guarda são as catracas de `listSource.test.ts`, `useLoadState.test.ts` e `useResourceState.test.ts`.
```

- [ ] **Step 3: Gate do bloco**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Esperado: lint exit 0; build verde; **85 arquivos / 467 testes** — baseline 81/453 mais 4 arquivos novos (`listSource.test.ts` 5, `InlineLoadState.test.tsx` 2, `RedatorCourseSelector.test.tsx` 2, `CourseRedatoresSection.test.tsx` 3) e as 2 catracas de promise em arquivos existentes. Contagem menor que a baseline reprova o gate.

- [ ] **Step 4: Provar a fronteira do bloco**

```bash
git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts
```
Esperado: **saída vazia**. É o que mantém Pint, `php artisan test` e `typescript:transform` N/A por escopo medido, e não por suposição.

- [ ] **Step 5: Commit**

```bash
git add .claude/rules/frontend-fsliced.md
git commit -m "docs(rules): a forma de lista nasce num lugar so, e o retry devolve a promise"
```

---

## DoD end-to-end — provado no navegador, não no diff

Roda depois da Task 10, com `docker compose up -d` e `pnpm dev`. **Falha ISOLADA de uma rota** — derrubar o nginx inteiro não serve: o `GET /api/me` morre junto e o shell redireciona para `/login` (lição medida no bloco de Meu Perfil).

- [ ] **1 · O "Reintentar" de tela cheia permanece em carga.** Em `/operacion/turmas/:id` (ou `/comercial/presupuestos/:id`), com `GET /api/turmas/:id` falhando, o `AppErrorState` aparece; ao clicar em "Reintentar" com a resposta **segurada em voo**, o botão fica em `loading` e `disabled` até a resposta chegar — hoje ele pisca e volta no mesmo tick.
- [ ] **2 · O "Reintentar" inline idem.** No diálogo de orçamento (`BudgetDialog:85`), com `GET /api/clients` falhando, o botão do `InlineLoadState` sob o dropdown fica em carga durante o voo.
- [ ] **3 · Falha COM cache não apaga a lista.** No diálogo de curso, abra a seção de redatores com a lista carregada, faça o `GET /api/redatores` seguinte falhar e reabra: a lista **permanece**, com o aviso ao lado — não o erro de seção inteira.
- [ ] **4 · Nada regrediu nas seis telas de arquivados.** `/comercial`, `/catalogo`, `/personas`, `/operacion` e `/administracion` seguem alternando ativo/arquivado, com a coluna de rastreio e o Reintentar da tabela.

**O que não é prova:** build verde, lint 0 e suíte verde não cobrem nenhum dos quatro itens acima — o contrato Q-14 é invisível para TypeScript, que é o motivo do débito ter durado.

---

## Handoff de execução

**executor: claude**

Não é task mecânica com paths fechados: a Task 6 muda assinatura de tipo público em três arquivos e a decisão de **não** adotar `loadFailure` em `useHistorial`/`useEmissionPanelState` depende de ler a política de cada um; a Task 7 mexe em `shared/ui`, que alcança 12 sítios de tela; a Task 10 escreve rule. As Tasks 8 e 9 exigem julgar onde o aviso pousa em componente sem teste prévio.
