# BD-17 · a superfície de arquivados — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pagar D-51, D-52 e D-53 — a data de arquivamento passa a sair no idioma da interface, a
escolha da fonte ativa/arquivada sai do JSX, e o par de colunas de rastreio deixa de existir em 8
cópias.

**Architecture:** três peças novas e nenhuma camada nova. `shared/lib/archivable.ts` ganha o tipo da
linha (`ArchivableRow<T>`) e a função pura que escolhe a fonte (`archivableSource`);
`shared/ui/archivedColumns.tsx` ganha o par de colunas como **função que devolve array** — nunca
componente (§2 da spec); `features/operation/hooks/` ganha os dois aliases que normalizam
`useTurmas()`/`usePendingQuotes()` para a mesma forma que `useCrudPage` já devolve. As 6 tabelas, as
2 listas e as 5 páginas passam a consumir essas peças.

**Tech Stack:** React 19 + TS 6 (Vite), PrimeReact via `shared/ui`, i18next, TanStack Query, vitest
(jsdom) + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-08-20-bd17-superficie-de-arquivados-design.md`
**Branch:** `feat/bd17-superficie-de-arquivados`, na worktree `/home/jvbat/projetos/fix-frontend`.
Todos os comandos rodam de `frontend/`.

## Global Constraints

- **Frontend puro.** No fechamento, `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
  devolve **zero arquivo**. Nenhuma task escreve em `backend/` nem em `generated.ts`.
- **`formatDate`, nunca `formatDateTime`** (D1 da spec): a coluna exibe a data e nada mais.
- **A peça de colunas é FUNÇÃO que devolve array.** Componente ou Fragment achatam para **uma**
  coluna sem `field` sob `Children.toArray`, e build/lint/suíte passam mesmo assim (§2 da spec).
- **`shared/lib` não importa `shared/api` nem `shared/hooks`.** Medido: `src/shared/lib/` tem hoje
  zero import de `shared/api`. O tipo do erro é `ScreenDetailSource`, que já mora em
  `shared/lib/screenDetail.ts` — `ProblemDetails` o satisfaz.
- **`shared/ui` não importa `shared/hooks`** (rule frontend-fsliced; molde: o `Mode` do
  `ArchiveSwitch`).
- **Feature não importa PrimeReact direto nem outra feature — nem para tipo** (lei §6).
- **`refetch` sempre devolve a promise.** É o que mantém o Reintentar do `AppErrorState` em
  `loading` enquanto o GET está em voo (Q-14). `() => void` compila e faz o tipo mentir.
- **Comportamento idêntico nas 8 telas, exceto a grafia da data.** Refatoração que muda o que a tela
  renderiza não é refatoração — é bug (peso legal).
- **Baseline da branch:** `pnpm lint` sai 0; `pnpm test` sai **77 arquivos / 435 testes**. Toda task
  compara contra isso.

## Correções medidas à spec

Duas linhas da §6.3 da spec foram escritas antes de passarem pelo `tsc` e **não compilam como
estão**. As correções abaixo preservam a intenção da §6.3 (a função devolve o lado escolhido, o
`mode` é lido de dentro do lado arquivado, `shared/lib` segue sem importar `shared/hooks`) e estão
registradas na §11 da spec.

| Spec §6.3 dizia | Medição | O que vale |
|---|---|---|
| `error: ProblemDetails \| null` | `ProblemDetails` mora em `shared/api`, e `shared/lib` tem **zero** import de lá hoje | `error: ScreenDetailSource \| null` — o tipo estrutural que `shared/lib` já exporta e que as 6 tabelas já declaram (`error?: { detail?: string \| null } \| null`) |
| `archivableSource<T>(...): ListSource<ArchivableRow<T>>` | `tsc -b` → `TS2322: Type 'T' is not assignable to type 'ArchivableRow<T>'` | `archivableSource<T>(active: ListSource<T>, archived: ArchivedListSource<T>): ListSource<T>` — compila, e o `items` devolvido é aceito por `courses: CourseRow[]` (medido) |

`ArchivableRow<T>` continua existindo e continua sendo o que a §6.1 pede: é ele que substitui as 8
declarações duplicadas de `XRow`.

## File Structure

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/shared/lib/archivable.ts` | `ArchiveTrail`, `ArchivableRow<T>`, `ListSource<T>`, `ArchivedListSource<T>`, `archivableSource` |
| `frontend/src/shared/lib/archivable.test.ts` | escolha por modo + guarda da promise do refetch |
| `frontend/src/shared/ui/archivedColumns.tsx` | o par de colunas de rastreio, como função |
| `frontend/src/shared/ui/archivedColumns.test.tsx` | colunas, regressão de idioma (D-51), catraca da forma (§2) |
| `frontend/src/features/operation/hooks/useTurmasPage.ts` | normaliza `useTurmas()` e `usePendingQuotes()` |
| `frontend/src/features/operation/hooks/useTurmasPage.test.tsx` | forma normalizada + promise do refetch |

**Modificados:**

| Arquivo | O que muda |
|---|---|
| `frontend/src/shared/lib/index.ts` | + `export * from './archivable'` |
| `frontend/src/shared/ui/index.ts` | + `export * from './archivedColumns'` |
| `.../catalog/components/Course/CoursesTable.tsx` | `CourseRow` via `ArchivableRow`; colunas via `archivedColumns` |
| `.../catalog/components/CatalogPage.tsx` | 4 ternários → `archivableSource` |
| `.../commercial/components/Client/ClientsTable.tsx` | idem tabela |
| `.../commercial/components/Budget/BudgetsTable.tsx` | idem tabela |
| `.../commercial/components/CommercialPage.tsx` | 8 ternários (2 abas) → 2 × `archivableSource` |
| `.../identity/components/Admin/UsersTable.tsx` | idem tabela |
| `.../identity/components/AdministracionPage.tsx` | 4 ternários → `archivableSource` |
| `.../identity/components/Redator/RedatoresTable.tsx` | idem tabela |
| `.../identity/components/Redator/RedatoresTab.tsx` | 4 ternários → `archivableSource` |
| `.../operation/components/Turma/TurmasTable.tsx` | idem tabela |
| `.../operation/components/OperationPage.tsx` | ternário aninhado + `pending` → aliases + `archivableSource` |
| `.../operation/components/Enrollment/ArchivedEnrollmentsList.tsx` | colunas fixas via `archivedColumns` |
| `.../commercial/components/Budget/ArchivedQuotesList.tsx` | o único `formatDate` direto que sobra |
| `.../commercial/components/Budget/QuotesList.tsx` | import do tipo renomeado |

---

### Task 1: `archivableSource` e `ArchivableRow` em `shared/lib`

**Files:**
- Create: `frontend/src/shared/lib/archivable.ts`
- Create: `frontend/src/shared/lib/archivable.test.ts`
- Modify: `frontend/src/shared/lib/index.ts`

**Interfaces:**
- Consumes: `ScreenDetailSource` de `./screenDetail`.
- Produces:
  - `type ArchiveTrail = { archived_at?: string; archived_by?: string | null }`
  - `type ArchivableRow<T> = T & ArchiveTrail`
  - `interface ListSource<T> { items: T[]; loading: boolean; error: ScreenDetailSource | null; refetch: () => Promise<unknown> }`
  - `interface ArchivedListSource<T> extends ListSource<T> { mode: 'active' | 'archived' }`
  - `function archivableSource<T>(active: ListSource<T>, archived: ArchivedListSource<T>): ListSource<T>`

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/lib/archivable.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { archivableSource, type ArchivedListSource, type ListSource } from './archivable'

interface Curso {
  id: number
  name: string
}

const ativa: ListSource<Curso> = {
  items: [{ id: 1, name: 'ativo' }],
  loading: false,
  error: null,
  refetch: () => Promise.resolve('ativa'),
}

function arquivada(mode: 'active' | 'archived'): ArchivedListSource<Curso> {
  return {
    mode,
    items: [{ id: 2, name: 'arquivado' }],
    loading: true,
    error: { detail: 'falhou', localDetail: true },
    refetch: () => Promise.resolve('arquivada'),
  }
}

describe('archivableSource', () => {
  it('devolve a fonte ATIVA inteira quando o modo e active', () => {
    // Inteira, e nao campo a campo: era o quarteto de ternarios sobre a mesma
    // condicao que as 6 paginas repetiam dentro das props (D-52).
    const fonte = archivableSource(ativa, arquivada('active'))

    expect(fonte.items).toEqual([{ id: 1, name: 'ativo' }])
    expect(fonte.loading).toBe(false)
    expect(fonte.error).toBeNull()
  })

  it('devolve a fonte ARQUIVADA inteira quando o modo e archived', () => {
    const fonte = archivableSource(ativa, arquivada('archived'))

    expect(fonte.items).toEqual([{ id: 2, name: 'arquivado' }])
    expect(fonte.loading).toBe(true)
    expect(fonte.error).toEqual({ detail: 'falhou', localDetail: true })
  })

  it('le o modo de DENTRO do lado arquivado, nao de um argumento solto', () => {
    // D5: assim e impossivel passar o modo de uma tabela e as fontes de outra.
    expect(archivableSource(ativa, arquivada('archived')).items[0].name).toBe('arquivado')
    expect(archivableSource(ativa, arquivada('active')).items[0].name).toBe('ativo')
  })

  it('PRESERVA a promise do refetch nos dois modos', async () => {
    // A guarda do D4: e a promise que mantem o Reintentar do AppErrorState em
    // `loading` enquanto o GET esta em voo (Q-14). Uma versao que chamasse
    // `void refetch()` compilaria e passaria por todos os testes acima.
    await expect(archivableSource(ativa, arquivada('active')).refetch()).resolves.toBe('ativa')
    await expect(archivableSource(ativa, arquivada('archived')).refetch()).resolves.toBe('arquivada')
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
pnpm exec vitest run src/shared/lib/archivable.test.ts
```

Esperado: FAIL — `Failed to resolve import "./archivable"`.

- [ ] **Step 3: Escreva a implementação**

Crie `frontend/src/shared/lib/archivable.ts`:

```ts
import type { ScreenDetailSource } from './screenDetail'

/** Os dois campos do rastreio de arquivamento, **opcionais**: no modo ativo eles
 * não existem na linha. É a diferença deliberada para o `ArchivedRow` privado do
 * `useArchivedPage`, onde os mesmos dois campos são OBRIGATÓRIOS — aquele é o DTO
 * do backend, este é a linha da tabela. Dois tipos com duas verdades; colidir o
 * nome é o que faria alguém trocar um pelo outro num refactor futuro. */
export type ArchiveTrail = { archived_at?: string; archived_by?: string | null }

/** A linha que a MESMA tabela renderiza nos dois modos. Estava declarada 8 vezes
 * — 6 tabelas e 2 listas —, cada cópia reafirmando os dois campos à mão (D-53). */
export type ArchivableRow<T> = T & ArchiveTrail

/**
 * A forma normalizada de uma lista de página: o que `useCrudPage` e
 * `useArchivedPage` já devolvem, escrita como contrato.
 *
 * `error` é `ScreenDetailSource`, e não `ProblemDetails`, de propósito:
 * `shared/lib` não importa de `shared/api` — mesma fronteira que fez o
 * `screenDetail` nascer aqui em vez de lá, e que `AppDataTable.tsx:16-20`
 * registra. `ProblemDetails` satisfaz a interface, e as 6 tabelas já tipam o
 * `error` delas estruturalmente.
 *
 * `refetch` devolve `Promise`, não `unknown`: é a promise que o `AppErrorState`
 * aguarda para manter o Reintentar em `loading` (Q-14). O tipo do consumidor não
 * pode ser mais preciso que o da fonte.
 */
export interface ListSource<T> {
  items: T[]
  loading: boolean
  error: ScreenDetailSource | null
  refetch: () => Promise<unknown>
}

/** A fonte arquivada é uma `ListSource` que sabe o próprio modo.
 *
 * O `mode` chega por DENTRO dela, e não como terceiro argumento de
 * `archivableSource` (D5): com o modo solto, passar o de uma tabela junto das
 * fontes de outra compilaria. O tipo é declarado estruturalmente aqui, sem
 * importar `ArchiveMode` de `shared/hooks` — mesma direção que o `Mode` do
 * `ArchiveSwitch` já respeita (D6). */
export interface ArchivedListSource<T> extends ListSource<T> {
  mode: 'active' | 'archived'
}

/**
 * A fonte de dados da tela: a ativa ou a arquivada, INTEIRA.
 *
 * Seis páginas repetiam o mesmo quarteto de ternários sobre a mesma condição,
 * dentro das props (`items`, `loading`, `error`, `refetch` — D-52). O que
 * ramifica é a fonte, não cada campo dela: quatro ternários independentes são
 * quatro oportunidades de um deles olhar a condição errada, que foi exatamente
 * o que aconteceu na `OperationPage` (ternário aninhado derivando `loadError` à
 * mão dentro da prop).
 *
 * Função pura, não hook (D2): não tem estado nem efeito, e nomeá-la `use*`
 * mentiria sobre o que ela é e a submeteria às regras de hooks sem motivo.
 */
export function archivableSource<T>(
  active: ListSource<T>,
  archived: ArchivedListSource<T>,
): ListSource<T> {
  return archived.mode === 'archived' ? archived : active
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
pnpm exec vitest run src/shared/lib/archivable.test.ts
```

Esperado: PASS — `Test Files 1 passed (1)`, `Tests 4 passed (4)`.

- [ ] **Step 5: Publique no barrel**

Em `frontend/src/shared/lib/index.ts`, insira a linha em ordem alfabética, antes de `./datetime`:

```ts
export * from './archivable'
export * from './datetime'
```

- [ ] **Step 6: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 78 passed (78)` / `Tests 439 passed (439)`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/lib/archivable.ts frontend/src/shared/lib/archivable.test.ts frontend/src/shared/lib/index.ts
git commit -m "feat(shared): archivableSource e ArchivableRow"
```

---

### Task 2: o par de colunas de rastreio em `shared/ui`

**Files:**
- Create: `frontend/src/shared/ui/archivedColumns.tsx`
- Create: `frontend/src/shared/ui/archivedColumns.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `AppColumn` de `./AppDataTable`; `formatDate` e `ArchiveTrail` de `@shared/lib` (Task 1).
- Produces: `function archivedColumns(t: (key: string) => string): ReactElement[]` — **função**, e o
  retorno é um array de dois `AppColumn` com `field="archived_at"` e `field="archived_by"`.
  Uso: `{archived && archivedColumns(t)}` nas tabelas, `{archivedColumns(t)}` onde as colunas são fixas.

O tipo do `t` é estrutural (`(key: string) => string`) e não `TFunction`: o repo não tem nenhum uso
de `TFunction` hoje, e o `t` real do `useTranslation()` satisfaz a assinatura — medido com `tsc -b`.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/ui/archivedColumns.test.tsx`:

```tsx
import { Children, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import i18n from '@shared/config/i18n'
import { AppColumn } from './AppDataTable'
import { archivedColumns } from './archivedColumns'

// O idioma da INTERFACE, nao o do runtime: em jsdom o `toLocaleDateString()` sem
// argumento resolve pelo locale do processo (en-US), e e justamente a divergencia
// entre os dois que o D-51 relata. Mesmo molde do AppFileRow.test.tsx.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})
afterAll(async () => {
  await i18n.changeLanguage('es-CL')
})

const t = (key: string) => key

/** Le as props de uma coluna do array devolvido. */
function coluna(indice: number) {
  const elemento = archivedColumns(t)[indice]
  return elemento.props as {
    field?: string
    header?: string
    body?: (linha: { archived_at?: string; archived_by?: string | null }) => unknown
  }
}

/** O `field` de cada filho DIRETO, como o DataTable o le
 * (`primereact/datatable/datatable.cjs.js:5973`). */
const campos = (filhos: ReactNode) =>
  Children.toArray(filhos).map((filho) =>
    isValidElement<{ field?: string }>(filho) ? filho.props.field : undefined,
  )

describe('archivedColumns', () => {
  it('devolve as DUAS colunas do rastreio, com field e header', () => {
    expect(archivedColumns(t)).toHaveLength(2)
    expect(coluna(0).field).toBe('archived_at')
    expect(coluna(0).header).toBe('archive.archivedAt')
    expect(coluna(1).field).toBe('archived_by')
    expect(coluna(1).header).toBe('archive.archivedBy')
  })

  it('formata a data no idioma da INTERFACE, nao no do navegador', () => {
    // D-51, o defeito que este bloco existe para pagar. `archived_at` vem do
    // backend como `->toIso8601String()` — data-hora completa, igual ao
    // `created_at` do AppFileRow —, entao NAO carrega o problema de fuso do
    // `formatIsoDate`: o defeito aqui e de idioma.
    //
    // A assercao mede contra o `Intl` da TAG fixada, nao contra `formatDate`:
    // comparar com `formatDate` passaria por acaso numa maquina cujo locale
    // coincidisse com o da interface — que e justamente a condicao em que o
    // defeito e invisivel.
    const iso = '2026-08-19T13:00:00Z'

    expect(coluna(0).body?.({ archived_at: iso })).toBe(new Date(iso).toLocaleDateString('es-CL'))
  })

  it('acompanha a TROCA de idioma da interface', async () => {
    const iso = '2026-08-19T13:00:00Z'
    await i18n.changeLanguage('en')

    expect(coluna(0).body?.({ archived_at: iso })).toBe(new Date(iso).toLocaleDateString('en'))

    await i18n.changeLanguage('es-CL')
  })

  it('cai no travessao quando nao ha data', () => {
    expect(coluna(0).body?.({})).toBe('—')
  })

  it('cai na chave de autor desconhecido quando archived_by e nulo', () => {
    expect(coluna(1).body?.({ archived_by: null })).toBe('archive.unknownAuthor')
    expect(coluna(1).body?.({ archived_by: 'Ana Perez' })).toBe('Ana Perez')
  })

  it('CATRACA: achata para duas colunas com field, e nao para uma', () => {
    // §2 da spec. `AppColumn` e reexport direto do `Column` do PrimeReact
    // (`AppDataTable.tsx:125`) e o DataTable le o filho DIRETO como coluna. Uma
    // versao COMPONENTE desta peca — ou um Fragment envolvendo as duas colunas —
    // achata para UM elemento sem `field`, e renderiza uma coluna lixo sem
    // estourar: build, lint e o resto desta suite passam do mesmo jeito. E por
    // isso que a decisao "funcao, nunca componente" precisa de catraca.
    const comoFuncao = [<AppColumn key="id" field="id" />, archivedColumns(t)]
    expect(campos(comoFuncao)).toEqual(['id', 'archived_at', 'archived_by'])

    const ComoComponente = () => <>{archivedColumns(t)}</>
    const comoComponente = [<AppColumn key="id" field="id" />, <ComoComponente key="c" />]
    expect(campos(comoComponente)).toEqual(['id', undefined])
  })

  it('CATRACA: o `archived &&` das tabelas segue seguro', () => {
    // `{archived && archivedColumns(t)}` no modo ativo passa `false`, e
    // `Children.toArray` o descarta — nenhuma coluna fantasma no modo ativo.
    expect(campos([<AppColumn key="id" field="id" />, false])).toEqual(['id'])
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
pnpm exec vitest run src/shared/ui/archivedColumns.test.tsx
```

Esperado: FAIL — `Failed to resolve import "./archivedColumns"`.

- [ ] **Step 3: Escreva a implementação**

Crie `frontend/src/shared/ui/archivedColumns.tsx`:

```tsx
import { formatDate, type ArchiveTrail } from '@shared/lib'
import { AppColumn } from './AppDataTable'

/**
 * O par de colunas do rastreio de arquivamento — "arquivado em" e "arquivado por".
 *
 * **É uma FUNÇÃO que devolve array, e isso não é estilo.** `AppColumn` é reexport
 * direto do `Column` do PrimeReact (`AppDataTable.tsx:125`), e o DataTable resolve
 * colunas com `Children.toArray(props.children)`
 * (`primereact/datatable/datatable.cjs.js:5973`): ele lê o filho DIRETO e busca
 * `field`/`header`/`body` nas props dele. Um componente `<ArchivedColumns />` — ou
 * um Fragment envolvendo as duas colunas — achata para UM elemento, sem `field`, e
 * renderiza uma coluna vazia **sem estourar**: build, lint e suíte passam. Um array
 * aninhado, ao contrário, o `Children.toArray` achata corretamente. Medido por sonda
 * antes de desenhar (§2 da spec), e guardado pela catraca em `archivedColumns.test.tsx`.
 *
 * `t` é tipado estruturalmente e não como `TFunction`: a peça precisa de "algo que
 * traduz uma chave", não do i18next inteiro, e é o chamador que já tem o `t` do
 * `useTranslation()`. `shared/ui` não vira consumidor do hook por causa disto.
 *
 * A data sai por `formatDate` — o idioma ATIVO da interface. Com a grafia crua
 * (`new Date(x).toLocaleDateString()`, sem argumento), o locale vinha do NAVEGADOR:
 * a interface em es-CL imprimia `8/19/2026` na coluna e `19-08-2026` no resto da
 * tela. É o mesmo defeito do D-18, que `AppFileRow.tsx:42-46` já corrigiu e comenta;
 * a superfície de arquivados era o último lugar do frontend com a grafia crua (D-51).
 * Só a data, sem hora (D1): `archived_at` carrega o timestamp completo, mas a hora
 * seria informação NOVA na tela, e este bloco corrige um defeito de idioma.
 *
 * Sem `sortable`: nenhuma das 6 tabelas o tinha, e acrescentá-lo aqui mudaria o
 * comportamento das 6 de uma vez.
 */
export function archivedColumns(t: (key: string) => string) {
  return [
    <AppColumn
      key="archived_at"
      field="archived_at"
      header={t('archive.archivedAt')}
      body={(linha: ArchiveTrail) =>
        linha.archived_at ? formatDate(new Date(linha.archived_at)) : '—'
      }
    />,
    <AppColumn
      key="archived_by"
      field="archived_by"
      header={t('archive.archivedBy')}
      body={(linha: ArchiveTrail) => linha.archived_by ?? t('archive.unknownAuthor')}
    />,
  ]
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
pnpm exec vitest run src/shared/ui/archivedColumns.test.tsx
```

Esperado: PASS — `Tests 7 passed (7)`.

- [ ] **Step 5: Publique no barrel**

Em `frontend/src/shared/ui/index.ts`, acrescente após a linha `export * from './ArchiveSwitch'`:

```ts
export * from './ArchiveSwitch'
// Arquivo plano, e não pasta: as pastas deste barrel são pasta-por-COMPONENTE, e
// esta peça deliberadamente não é componente (ver o docblock dela).
export * from './archivedColumns'
```

- [ ] **Step 6: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 79 passed (79)` / `Tests 446 passed (446)`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/archivedColumns.tsx frontend/src/shared/ui/archivedColumns.test.tsx frontend/src/shared/ui/index.ts
git commit -m "feat(shared): archivedColumns, o par de colunas de rastreio"
```

---

### Task 3: os aliases que normalizam turmas e pendentes

**Files:**
- Create: `frontend/src/features/operation/hooks/useTurmasPage.ts`
- Create: `frontend/src/features/operation/hooks/useTurmasPage.test.tsx`

**Interfaces:**
- Consumes: `useTurmas`, `usePendingQuotes` de `../api/useTurmas`.
- Produces:
  - `useTurmasPage(): { items: TurmaData[]; loading: boolean; error: ProblemDetails | null; refetch: () => Promise<unknown> }`
  - `usePendingQuotesPage(): { items: PendingQuoteData[]; loading: boolean; error: ProblemDetails | null; refetch: () => Promise<unknown> }`

Por que não `useLoadState` (D4 da spec): o `refetch` dele faz `void query.refetch()`
(`useLoadState.ts:51-53`) e descarta a promise. Usá-lo aqui regrediria o Q-14 **sem quebrar tipo nem
teste** — TS aceita descartar retorno. Os dois aliases seguem o molde dos 7 `useXPage` que já
existem, e devolvem a promise.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/features/operation/hooks/useTurmasPage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '@shared/api/axios'
import { usePendingQuotesPage, useTurmasPage } from './useTurmasPage'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useTurmasPage', () => {
  beforeEach(() => get.mockReset())

  it('normaliza a query crua na MESMA forma que useCrudPage devolve', async () => {
    // A assimetria era o pior caso do D-52: `useTurmas()` devolve `UseQueryResult`
    // cru, entao so a OperationPage derivava `loadError` a mao, em ternario
    // aninhado dentro da prop.
    get.mockResolvedValue({ data: [{ id: 7, code: 'T-7' }] })

    const { result } = renderHook(() => useTurmasPage(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([{ id: 7, code: 'T-7' }])
    expect(result.current.error).toBeNull()
  })

  it('devolve items vazio, e nao undefined, antes de a query voltar', () => {
    // `[]` e o que a tabela consome; `undefined` faria cada chamador escrever o
    // proprio `?? []`, que era metade do quarteto de ternarios.
    get.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useTurmasPage(), { wrapper })

    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('devolve o envelope da falha, e `{}` quando o interceptor nao populou o corpo', async () => {
    get.mockRejectedValue(undefined)

    const { result } = renderHook(() => useTurmasPage(), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toEqual({})
  })

  it('DEVOLVE a promise do refetch', async () => {
    // A guarda do D4: `useLoadState` faz `void query.refetch()` e a engole. E a
    // promise que mantem o Reintentar do AppErrorState em `loading` (Q-14), e
    // trocar por `() => void` aqui compilaria sem quebrar nenhum teste acima.
    get.mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useTurmasPage(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.refetch()).resolves.toBeDefined()
  })
})

describe('usePendingQuotesPage', () => {
  beforeEach(() => get.mockReset())

  it('normaliza a fila de pendentes na mesma forma', async () => {
    get.mockResolvedValue({ data: [{ quote_id: 3 }] })

    const { result } = renderHook(() => usePendingQuotesPage(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([{ quote_id: 3 }])
    expect(result.current.error).toBeNull()
  })

  it('DEVOLVE a promise do refetch', async () => {
    get.mockResolvedValue({ data: [] })

    const { result } = renderHook(() => usePendingQuotesPage(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.refetch()).resolves.toBeDefined()
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

```bash
pnpm exec vitest run src/features/operation/hooks/useTurmasPage.test.tsx
```

Esperado: FAIL — `Failed to resolve import "./useTurmasPage"`.

- [ ] **Step 3: Escreva a implementação**

Crie `frontend/src/features/operation/hooks/useTurmasPage.ts`:

```ts
import type { ProblemDetails } from '@shared/api/axios'
import { usePendingQuotes, useTurmas } from '../api/useTurmas'

/**
 * Os dois aliases de página do módulo de operação, no molde dos 7 `useXPage` que
 * já existem — eles não são delegação vazia, são o que mantém a query fora do
 * componente.
 *
 * O que estes dois acrescentam aos outros sete: `useTurmas.ts` é artesanal e não
 * passa pela fábrica `createCrudResource`, então devolve `UseQueryResult` cru. Era
 * a assimetria que fazia a `OperationPage` ser a ÚNICA a derivar o estado de carga
 * à mão, em ternário aninhado dentro da prop:
 *
 *     error={archived ? turmasArchived.error : turmas.isError ? (turmas.error ?? {}) : null}
 *
 * Esse `isError ? (error ?? {}) : null` é literalmente o `loadError` do
 * `useLoadState`, e a rule é explícita em que estado de carga de lista não se
 * deriva à mão na feature (Q-1/Q-2 do review de 2026-08-14).
 *
 * **`useLoadState` não serve aqui, e isso foi medido:** o `refetch` dele faz
 * `void query.refetch()` (`useLoadState.ts:51-53`) e descarta a promise que o
 * `AppErrorState` aguarda para manter o Reintentar em `loading` (Q-14). Usá-lo
 * regrediria esse contrato **sem quebrar tipo nem teste** — TS aceita descartar
 * retorno (D4 da spec).
 */
export function useTurmasPage() {
  const query = useTurmas()

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    /** `null` em sucesso, inclusive com lista vazia — vazio não é erro (D16). O
     * `{}` cobre o erro de rede que não passa pelo interceptor: `isError` sem
     * `ProblemDetails` ainda é falha, e devolver `null` a esconderia. */
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Devolve a promise (Q-14). */
    refetch: () => query.refetch(),
  }
}

/** A fila de cotizações pendentes de configuração, na mesma forma. Não é
 * superfície de arquivados — alimenta o `PendingQuotesPanel` —, mas carregava o
 * MESMO `isError ? (error ?? {}) : null` cru no mesmo arquivo (`OperationPage:31`),
 * e a ficha do D-52 o nomeia. */
export function usePendingQuotesPage() {
  const query = usePendingQuotes()

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    refetch: () => query.refetch(),
  }
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

```bash
pnpm exec vitest run src/features/operation/hooks/useTurmasPage.test.tsx
```

Esperado: PASS — `Tests 6 passed (6)`.

- [ ] **Step 5: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/operation/hooks/useTurmasPage.ts frontend/src/features/operation/hooks/useTurmasPage.test.tsx
git commit -m "feat(operation): useTurmasPage e usePendingQuotesPage"
```

---

### Task 4: Catálogo — `CoursesTable` + `CatalogPage`

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx:9-13, 87-100`
- Modify: `frontend/src/features/catalog/components/CatalogPage.tsx:22-26`

**Interfaces:**
- Consumes: `archivedColumns` (Task 2), `ArchivableRow` e `archivableSource` (Task 1).
- Produces: nada para tasks seguintes. `export type CourseRow` mantém o nome — só a definição muda.

- [ ] **Step 1: Troque a declaração do tipo em `CoursesTable.tsx`**

Substitua as linhas 9-13:

```tsx
/** A mesma tabela serve as duas fontes — gêmeo do `ClientRow`. */
export type CourseRow = CourseData & {
  archived_at?: string
  archived_by?: string | null
}
```

por:

```tsx
/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type CourseRow = ArchivableRow<CourseData>
```

E acrescente o import, depois da linha 5 (`import { AppColumn, ArchiveSwitch, ... } from '@shared/ui'`):

```tsx
import { AppColumn, ArchiveSwitch, AppEmptyState, SearchableTableFrame, archivedColumns } from '@shared/ui'
import type { ArchivableRow } from '@shared/lib'
```

- [ ] **Step 2: Troque os dois blocos de coluna**

Substitua as linhas 87-100:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(c: CourseRow) => (c.archived_at ? new Date(c.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(c: CourseRow) => c.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

por:

```tsx
      {archived && archivedColumns(t)}
```

- [ ] **Step 3: Troque os 4 ternários em `CatalogPage.tsx`**

Acrescente o import, depois da linha 5 (`import type { CourseData } ...`):

```tsx
import { archivableSource } from '@shared/lib'
```

**Substitua** a linha 17 — `const archived` não sobrevive à troca (medido: depois dela o `tsc`
acusa `TS6133: 'archived' is declared but its value is never read`; quem decide `emptyState` e
`actions` pelo modo é a `CoursesTable`, que recebe `mode`, não esta página):

```tsx
  const archived = archivedPage.mode === 'archived'
```

por:

```tsx
  // A fonte da tela é uma escolha só, não quatro (D-52): `items`, `loading`,
  // `error` e `refetch` vinham de quatro ternários independentes sobre a MESMA
  // condição, dentro das props.
  const fonte = archivableSource(page, archivedPage)
```

Substitua as linhas 23-26:

```tsx
          courses={archived ? archivedPage.items : page.items}
          loading={archived ? archivedPage.loading : page.loading}
          error={archived ? archivedPage.error : page.error}
          onRetry={archived ? archivedPage.refetch : page.refetch}
```

por:

```tsx
          courses={fonte.items}
          loading={fonte.loading}
          error={fonte.error}
          onRetry={fonte.refetch}
```

- [ ] **Step 4: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

**Isto foi medido durante o planejamento**, com as Tasks 1, 2 e 4 aplicadas numa sonda (sem a Task 3,
que acrescenta 1 arquivo e 6 testes): `tsc` limpo, `eslint src/features/catalog` limpo, suíte
`79 passed` / `446 passed`. Com a Task 3 no lugar, os números são os 80 / 452 acima.

Se o `tsc` acusar `TS6133` em `archived`, o Step 3 foi aplicado como acréscimo em vez de
substituição.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/catalog
git commit -m "refactor(catalog): cursos adotam archivedColumns e archivableSource"
```

---

### Task 5: Comercial — `ClientsTable`, `BudgetsTable` e `CommercialPage`

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx:16-22, 107-122`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx:17-23, 121-134`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx:35-38, 54-57`

**Interfaces:**
- Consumes: `archivedColumns` (Task 2), `ArchivableRow` e `archivableSource` (Task 1).
- Produces: `export type ClientRow` e `export type BudgetRow` mantêm o nome.

Este arquivo de página tem **duas** abas com o quarteto, sobre condições DIFERENTES (`archived` para
clientes, `budgetArchived` para orçamentos). São duas chamadas de `archivableSource`, não uma.

- [ ] **Step 1: `ClientsTable.tsx` — tipo e import**

Substitua as linhas 16-22:

```tsx
/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do
 * rastreio vêm preenchidas pelo achatamento do `useArchivedPage`; em `active`
 * elas nem são renderizadas. */
export type ClientRow = ClientData & {
  archived_at?: string;
  archived_by?: string | null;
};
```

por:

```tsx
/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type ClientRow = ArchivableRow<ClientData>;
```

E acrescente `archivedColumns` ao import de `@shared/ui` (linhas 5-12) e o import do tipo:

```tsx
import {
  AppColumn,
  ArchiveSwitch,
  IdentityCell,
  AppTag,
  AppEmptyState,
  SearchableTableFrame,
  archivedColumns,
} from "@shared/ui";
import type { ArchivableRow } from "@shared/lib";
```

- [ ] **Step 2: `ClientsTable.tsx` — as colunas**

Substitua as linhas 107-122:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t("archive.archivedAt")}
          body={(c: ClientRow) =>
            c.archived_at ? new Date(c.archived_at).toLocaleDateString() : "—"
          }
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t("archive.archivedBy")}
          body={(c: ClientRow) => c.archived_by ?? t("archive.unknownAuthor")}
        />
      )}
```

por:

```tsx
      {archived && archivedColumns(t)}
```

- [ ] **Step 3: `BudgetsTable.tsx` — tipo e import**

Substitua as linhas 17-23:

```tsx
/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do rastreio
 * vêm preenchidas pelo achatamento do `useArchivedPage`; em `active` elas nem são
 * renderizadas. Molde: `ClientRow`. */
export type BudgetRow = BudgetData & {
  archived_at?: string
  archived_by?: string | null
}
```

por:

```tsx
/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type BudgetRow = ArchivableRow<BudgetData>
```

E nos imports (linhas 4-12), acrescente `archivedColumns` ao bloco de `@shared/ui` e
`ArchivableRow` ao de `@shared/lib`:

```tsx
import {
  AppColumn, AppTag, IdentityCell,
  AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns,
} from '@shared/ui'
```

```tsx
import { formatUf, type ArchivableRow } from '@shared/lib'
```

- [ ] **Step 4: `BudgetsTable.tsx` — as colunas**

Substitua as linhas 121-134:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(b: BudgetRow) => (b.archived_at ? new Date(b.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(b: BudgetRow) => b.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

por:

```tsx
      {archived && archivedColumns(t)}
```

Atenção à posição: nesta tabela as duas colunas do rastreio vêm **antes** da coluna de ações. A
substituição preserva a posição; não mova o bloco.

- [ ] **Step 5: `CommercialPage.tsx` — as duas fontes**

Acrescente o import depois da linha 6 (`import type { ClientData } ...`):

```tsx
import { archivableSource } from '@shared/lib'
```

**Substitua** as linhas 26-27 — os dois booleanos não sobrevivem à troca (esta página não os consome
em mais nada; quem decide `emptyState`/`actions` pelo modo são as tabelas, que recebem `mode`):

```tsx
  const archived = clientsArchived.mode === 'archived'
  const budgetArchived = budgetsArchived.mode === 'archived'
```

por:

```tsx
  // Duas abas, duas fontes: as condições são DIFERENTES (clientes e orçamentos têm
  // interruptores próprios), então são duas chamadas, não uma (D-52).
  const fonteClientes = archivableSource(clients, clientsArchived)
  const fonteOrcamentos = archivableSource(budgets, budgetsArchived)
```

Substitua as linhas 35-38:

```tsx
              clients={archived ? clientsArchived.items : clients.items}
              loading={archived ? clientsArchived.loading : clients.loading}
              error={archived ? clientsArchived.error : clients.error}
              onRetry={archived ? clientsArchived.refetch : clients.refetch}
```

por:

```tsx
              clients={fonteClientes.items}
              loading={fonteClientes.loading}
              error={fonteClientes.error}
              onRetry={fonteClientes.refetch}
```

E substitua as linhas 54-57:

```tsx
              budgets={budgetArchived ? budgetsArchived.items : budgets.items}
              loading={budgetArchived ? budgetsArchived.loading : budgets.loading}
              error={budgetArchived ? budgetsArchived.error : budgets.error}
              onRetry={budgetArchived ? budgetsArchived.refetch : budgets.refetch}
```

por:

```tsx
              budgets={fonteOrcamentos.items}
              loading={fonteOrcamentos.loading}
              error={fonteOrcamentos.error}
              onRetry={fonteOrcamentos.refetch}
```

- [ ] **Step 6: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

Se o `tsc` acusar `TS6133` em `archived` ou `budgetArchived`, o Step 5 foi aplicado como acréscimo
em vez de substituição. Depois da troca, as duas chamadas de `archivableSource` são as únicas
leitoras do modo nesta página.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial
git commit -m "refactor(commercial): clientes e orcamentos adotam archivedColumns e archivableSource"
```

---

### Task 6: Administración — `UsersTable` + `AdministracionPage`

**Files:**
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx:10-14, 83-96`
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx:31-34`

**Interfaces:**
- Consumes: `archivedColumns` (Task 2), `ArchivableRow` e `archivableSource` (Task 1).
- Produces: `export type UserRow` mantém o nome.

- [ ] **Step 1: `UsersTable.tsx` — tipo e imports**

Substitua as linhas 10-14:

```tsx
/** A mesma tabela serve as duas fontes. Molde: `ClientRow`. */
export type UserRow = UserData & {
  archived_at?: string
  archived_by?: string | null
}
```

por:

```tsx
/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type UserRow = ArchivableRow<UserData>
```

Nos imports (linhas 5 e 7), acrescente `archivedColumns` e `ArchivableRow`:

```tsx
import { AppColumn, IdentityCell, AppTag, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns } from '@shared/ui'
```

```tsx
import { formatDateTime, type ArchivableRow } from '@shared/lib'
```

`formatDateTime` **continua** — ele é do "último acesso" (`last_login`), que não é a coluna do
rastreio e não muda neste bloco.

- [ ] **Step 2: `UsersTable.tsx` — as colunas**

Substitua as linhas 83-96:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(u: UserRow) => (u.archived_at ? new Date(u.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(u: UserRow) => u.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

por:

```tsx
      {archived && archivedColumns(t)}
```

- [ ] **Step 3: `AdministracionPage.tsx` — a fonte**

Acrescente o import depois da linha 5 (`import type { UserData } ...`):

```tsx
import { archivableSource } from '@shared/lib'
```

**Substitua** a linha 22 — `const archived` não sobrevive à troca (esta página não o consome em mais
nada; quem decide `emptyState`/`actions` pelo modo é a `UsersTable`, que recebe `mode`):

```tsx
  const archived = usersArchived.mode === 'archived'
```

por:

```tsx
  // A fonte da tela é uma escolha só, não quatro (D-52).
  const fonte = archivableSource(page, usersArchived)
```

Substitua as linhas 31-34:

```tsx
              users={archived ? usersArchived.items : page.items}
              loading={archived ? usersArchived.loading : page.loading}
              error={archived ? usersArchived.error : page.error}
              onRetry={archived ? usersArchived.refetch : page.refetch}
```

por:

```tsx
              users={fonte.items}
              loading={fonte.loading}
              error={fonte.error}
              onRetry={fonte.refetch}
```

- [ ] **Step 4: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

Se o `tsc` acusar `TS6133` em `archived`, o Step 3 foi aplicado como acréscimo em vez de
substituição.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/identity/components/Admin frontend/src/features/identity/components/AdministracionPage.tsx
git commit -m "refactor(identity): usuarios adotam archivedColumns e archivableSource"
```

---

### Task 7: Redatores — `RedatoresTable` + `RedatoresTab`

**Files:**
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx:11-17, 101-114`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTab.tsx:56-59`

**Interfaces:**
- Consumes: `archivedColumns` (Task 2), `ArchivableRow` e `archivableSource` (Task 1).
- Produces: `export type RedatorRow` mantém o nome.

- [ ] **Step 1: `RedatoresTable.tsx` — tipo e imports**

Substitua as linhas 11-17:

```tsx
/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do rastreio
 * vêm preenchidas pelo achatamento do `useArchivedPage`; em `active` elas nem são
 * renderizadas. Molde: `ClientRow`. */
export type RedatorRow = RedatorData & {
  archived_at?: string
  archived_by?: string | null
}
```

por:

```tsx
/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type RedatorRow = ArchivableRow<RedatorData>
```

Nos imports (linhas 5 e 7), acrescente `archivedColumns` e `ArchivableRow`:

```tsx
import { AppColumn, IdentityCell, AppTag, AppButton, AppEmptyState, ArchiveSwitch, SearchableTableFrame, useToast, archivedColumns } from '@shared/ui'
```

```tsx
import { idoneidade, IDONEIDADE_SEVERITY, formatDateTime, type ArchivableRow } from '@shared/lib'
```

- [ ] **Step 2: `RedatoresTable.tsx` — as colunas**

Substitua as linhas 101-114:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(r: RedatorRow) => (r.archived_at ? new Date(r.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(r: RedatorRow) => r.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

por:

```tsx
      {archived && archivedColumns(t)}
```

- [ ] **Step 3: `RedatoresTab.tsx` — a fonte**

Acrescente o import depois da linha 6 (`import type { RedatorData } ...`):

```tsx
import { archivableSource } from '@shared/lib'
```

**Substitua** a linha 30 — `const archived` não sobrevive à troca (esta aba não o consome em mais
nada; quem decide `emptyState`/`actions` pelo modo é a `RedatoresTable`, que recebe `mode`):

```tsx
  const archived = redatoresArchived.mode === 'archived'
```

por:

```tsx
  // A fonte da tela é uma escolha só, não quatro (D-52).
  const fonte = archivableSource(page, redatoresArchived)
```

Substitua as linhas 56-59:

```tsx
        redatores={archived ? redatoresArchived.items : page.items}
        loading={archived ? redatoresArchived.loading : page.loading}
        error={archived ? redatoresArchived.error : page.error}
        onRetry={archived ? redatoresArchived.refetch : page.refetch}
```

por:

```tsx
        redatores={fonte.items}
        loading={fonte.loading}
        error={fonte.error}
        onRetry={fonte.refetch}
```

- [ ] **Step 4: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

Se o `tsc` acusar `TS6133` em `archived`, o Step 3 foi aplicado como acréscimo em vez de
substituição.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/identity/components/Redator
git commit -m "refactor(identity): redatores adotam archivedColumns e archivableSource"
```

---

### Task 8: Operación — `TurmasTable` + `OperationPage`

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx:17-22, 112-127`
- Modify: `frontend/src/features/operation/components/OperationPage.tsx:6, 18-19, 29-33, 37-40`

**Interfaces:**
- Consumes: `archivedColumns` (Task 2), `ArchivableRow` e `archivableSource` (Task 1),
  `useTurmasPage` e `usePendingQuotesPage` (Task 3).
- Produces: `export type TurmaRow` mantém o nome.

É o pior caso do D-52: o ternário aninhado dentro da prop `error`, mais o `pending` com a mesma
grafia crua no mesmo arquivo.

- [ ] **Step 1: `TurmasTable.tsx` — tipo e imports**

Substitua as linhas 17-22:

```tsx
/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do rastreio
 * vêm preenchidas pelo achatamento do `useArchivedPage`. Molde: `ClientRow`. */
export type TurmaRow = TurmaData & {
  archived_at?: string
  archived_by?: string | null
}
```

por:

```tsx
/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type TurmaRow = ArchivableRow<TurmaData>
```

Nos imports (linhas 4-6), acrescente `archivedColumns` e o import do tipo:

```tsx
import {
  AppColumn, AppDropdown, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns,
} from '@shared/ui'
```

E acrescente, depois da linha 9 (`import type { TurmaData } ...`):

```tsx
import type { ArchivableRow } from '@shared/lib'
```

- [ ] **Step 2: `TurmasTable.tsx` — as colunas**

Substitua as linhas 112-127:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(turma: TurmaRow) =>
            turma.archived_at ? new Date(turma.archived_at).toLocaleDateString() : '—'
          }
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(turma: TurmaRow) => turma.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

por:

```tsx
      {archived && archivedColumns(t)}
```

- [ ] **Step 3: `OperationPage.tsx` — troque a query crua pelos aliases**

Substitua a linha 6:

```tsx
import { useTurmas, usePendingQuotes } from '../api/useTurmas'
```

por:

```tsx
import { usePendingQuotesPage, useTurmasPage } from '../hooks/useTurmasPage'
import { archivableSource } from '@shared/lib'
```

Substitua as linhas 18-19:

```tsx
  const turmas = useTurmas()
  const pending = usePendingQuotes()
```

por:

```tsx
  const turmas = useTurmasPage()
  const pending = usePendingQuotesPage()
```

E **substitua** a linha 23 — `const archived` não sobrevive à troca (esta página não o consome em
mais nada; quem decide `emptyState`/`actions` pelo modo é a `TurmasTable`, que recebe `mode`):

```tsx
  const archived = turmasArchived.mode === 'archived'
```

por:

```tsx
  // A fonte da tela é uma escolha só, não quatro — e aqui o quarto era um
  // ternário ANINHADO dentro da prop, derivando `loadError` à mão porque
  // `useTurmas()` devolvia a query crua (D-52, pior caso).
  const fonte = archivableSource(turmas, turmasArchived)
```

- [ ] **Step 4: `OperationPage.tsx` — as props**

Substitua as linhas 29-33:

```tsx
          <PendingQuotesPanel
            items={pending.data ?? []}
            error={pending.isError ? (pending.error ?? {}) : null}
            onRetry={pending.refetch}
          />
```

por:

```tsx
          <PendingQuotesPanel items={pending.items} error={pending.error} onRetry={pending.refetch} />
```

E substitua as linhas 37-40:

```tsx
            turmas={archived ? turmasArchived.items : (turmas.data ?? [])}
            loading={archived ? turmasArchived.loading : turmas.isLoading}
            error={archived ? turmasArchived.error : turmas.isError ? (turmas.error ?? {}) : null}
            onRetry={archived ? turmasArchived.refetch : turmas.refetch}
```

por:

```tsx
            turmas={fonte.items}
            loading={fonte.loading}
            error={fonte.error}
            onRetry={fonte.refetch}
```

- [ ] **Step 5: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

Se o `tsc` acusar `TS6133` em `archived`, o Step 3 foi aplicado como acréscimo em vez de
substituição.

O comentário do topo da função (linhas 12-15, sobre `usePendingQuotes` disparar sempre e o 403)
**continua verdadeiro** — o alias não muda o `enabled` da query. Não o apague.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/operation/components
git commit -m "refactor(operation): turmas adotam archivedColumns, archivableSource e os aliases"
```

---

### Task 9: `ArchivedEnrollmentsList` — colunas fixas

**Files:**
- Modify: `frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx:1-10, 63-74`

**Interfaces:**
- Consumes: `archivedColumns` (Task 2), `ArchivableRow` (Task 1).
- Produces: `export type ArchivedEnrollmentRow` mantém o nome.

Aqui as colunas **não** são condicionais — a lista só existe no modo arquivado —, então a chamada é
`{archivedColumns(t)}` sem guarda.

- [ ] **Step 1: Tipo e imports**

Substitua as linhas 1-10:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions, useTableFilter } from '@shared/hooks'
import { AppButton, AppColumn, AppDataTable, AppEmptyState, IdentityCell } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'

/** Molde `ClientRow`: a forma achatada pelo `useArchivedPage`. */
export type ArchivedEnrollmentRow = EnrollmentData & {
  archived_at?: string
  archived_by?: string | null
}
```

por:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions, useTableFilter } from '@shared/hooks'
import {
  AppButton, AppColumn, AppDataTable, AppEmptyState, IdentityCell, archivedColumns,
} from '@shared/ui'
import type { ArchivableRow } from '@shared/lib'
import type { EnrollmentData } from '@shared/types/generated'

/** A forma achatada pelo `useArchivedPage`. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type ArchivedEnrollmentRow = ArchivableRow<EnrollmentData>
```

- [ ] **Step 2: As colunas**

Substitua as linhas 63-74:

```tsx
      <AppColumn
        field="archived_at"
        header={t('archive.archivedAt')}
        body={(e: ArchivedEnrollmentRow) =>
          e.archived_at ? new Date(e.archived_at).toLocaleDateString() : '—'
        }
      />
      <AppColumn
        field="archived_by"
        header={t('archive.archivedBy')}
        body={(e: ArchivedEnrollmentRow) => e.archived_by ?? t('archive.unknownAuthor')}
      />
```

por:

```tsx
      {/* Sem guarda de modo: esta lista SÓ existe no modo arquivado, então as duas
          colunas são fixas. */}
      {archivedColumns(t)}
```

- [ ] **Step 3: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

`EnrollmentSection.test.tsx` monta esta lista — se ele falhar, a ordem ou o conteúdo das colunas
mudou, e isso é bug, não refatoração. Leia a falha antes de tocar no teste.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx
git commit -m "refactor(operation): matriculas arquivadas adotam archivedColumns"
```

---

### Task 10: `ArchivedQuotesList` — o único `formatDate` direto que sobra

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/ArchivedQuotesList.tsx:1-11, 81`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx:8`

**Interfaces:**
- Consumes: `ArchivableRow` e `formatDate` (Task 1 / `shared/lib`).
- Produces: `export type QuoteRow` mantém o nome (a `QuotesList` o importa como `ArchivedRow`).

Esta é **layout flex, não tabela** — não há coluna para extrair. Dos 8 sítios do D-51, 7 somem nas
tasks anteriores dentro do `archivedColumns`; este é o único que fica com a chamada direta.

- [ ] **Step 1: Tipo e imports**

Substitua as linhas 1-11:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton, InlineLoadState } from '@shared/ui'
import { formatUf } from '@shared/lib'
import type { QuoteData } from '@shared/types/generated'

/** Molde `ClientRow`: a mesma forma achatada pelo `useArchivedPage`. */
export type QuoteRow = QuoteData & {
  archived_at?: string
  archived_by?: string | null
}
```

por:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton, InlineLoadState } from '@shared/ui'
import { formatDate, formatUf, type ArchivableRow } from '@shared/lib'
import type { QuoteData } from '@shared/types/generated'

/** A mesma forma achatada pelo `useArchivedPage`. O par de campos do rastreio vive
 * em `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type QuoteRow = ArchivableRow<QuoteData>
```

- [ ] **Step 2: A data**

Substitua a linha 81:

```tsx
            {t('archive.archivedAt')}: {q.archived_at ? new Date(q.archived_at).toLocaleDateString() : '—'}
```

por:

```tsx
            {/* `toLocaleDateString()` sem locale cai no idioma do NAVEGADOR, não no
                da interface (D-51/D-18). Layout flex, não tabela: é o único dos 8
                sítios que não some dentro do `archivedColumns`. */}
            {t('archive.archivedAt')}: {q.archived_at ? formatDate(new Date(q.archived_at)) : '—'}
```

- [ ] **Step 3: Confirme o import de tipo na `QuotesList`**

A linha 8 de `QuotesList.tsx` importa o tipo com apelido:

```tsx
import { ArchivedQuotesList, type QuoteRow as ArchivedRow } from './ArchivedQuotesList'
```

O nome exportado não mudou, então **esta linha não muda**. Verifique que segue igual — se o `tsc`
reclamar dela, o Step 1 renomeou o export por engano.

- [ ] **Step 4: Gate**

```bash
pnpm exec tsc -b && pnpm lint && pnpm test
```

Esperado: `tsc` sem saída, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.

`QuotesList.test.tsx` cobre esta tela — se ele falhar, leia a falha antes de tocar no teste.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/ArchivedQuotesList.tsx
git commit -m "fix(commercial): data de arquivamento da cotacao no idioma da interface"
```

---

### Task 11: gate de fechamento — a prova comportamental

**Files:** nenhum. Esta task **prova**; não escreve código.

Build verde não é aceite (lei §8). O que fecha o bloco é a tela.

- [ ] **Step 1: Prove que o bloco é frontend puro**

Da **raiz do repositório** (o pathspec do git é relativo ao CWD):

```bash
cd /home/jvbat/projetos/fix-frontend
git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: **saída vazia**. É isso que mantém suíte de backend, Pint e `typescript:transform` N/A por
escopo medido. Saída não-vazia → o bloco saiu da fronteira declarada na §1 da spec; PARE.

- [ ] **Step 2: Prove que a grafia crua acabou**

De `frontend/`:

```bash
grep -rn "toLocaleDateString()" src/
```

Esperado: **exatamente estas duas linhas, e nenhuma outra** —

```
src/shared/ui/AppFileRow/AppFileRow.tsx:42:  // `toLocaleDateString()` sem locale cai no idioma do NAVEGADOR: a interface em
src/shared/ui/AppFileRow/AppFileRow.test.tsx:27:    // D-18: `new Date(createdAt).toLocaleDateString()` sem locale cai no idioma
```

As duas são **comentário**, não código: são o registro do D-18, o precedente que este bloco repete.
Não as apague. Qualquer terceira linha é um sítio de D-51 não pago — hoje são 8 (medido no
planejamento), e as 8 desaparecem nas Tasks 4-10.

- [ ] **Step 3: Prove que o tipo duplicado acabou**

De `frontend/`:

```bash
grep -rln "archived_at?: string" src/features/
```

Esperado: **saída vazia** — as 8 declarações à mão (medidas no planejamento: exatamente estes 8
arquivos) viraram `ArchivableRow<T>`. `src/shared/lib/archivable.ts` é a única declaração legítima e
não está sob `features/`.

- [ ] **Step 4: Gate automatizado completo**

```bash
pnpm build && pnpm lint && pnpm test
```

Esperado: build sem erro, lint exit 0, `Test Files 80 passed (80)` / `Tests 452 passed (452)`.
Baseline era 77 / 435 — o bloco acrescenta 3 arquivos e 17 testes e **não remove nenhum**.

- [ ] **Step 5: Prova no navegador — a condição em que o defeito é visível**

Suba o ambiente e abra a SPA:

```bash
docker compose up -d
cd frontend && pnpm dev
```

**A condição importa:** o navegador em **`en-US`** e a interface em **`es-CL`**. Rodar com os dois no
mesmo idioma não prova nada — é exatamente a coincidência que torna o defeito invisível.

Percorra as **8 superfícies**, cada uma nos dois modos (ativo e arquivado):

| # | Tela | Rota / caminho |
|---|---|---|
| 1 | Cursos | `/cursos` |
| 2 | Clientes | `/comercial` → aba Clientes |
| 3 | Presupuestos | `/comercial` → aba Presupuestos |
| 4 | Usuarios | `/administracion` → aba Usuarios |
| 5 | Redatores | `/personas` → aba Redatores |
| 6 | Turmas | `/operacion` |
| 7 | Matrículas arquivadas | detalhe de turma → aba de arquivados |
| 8 | Cotações arquivadas | detalhe de presupuesto → interruptor de arquivados |

Em cada uma, confirme:

- [ ] a coluna **"Archivado el"** mostra `19-08-2026` (formato es-CL), **não** `8/19/2026`;
- [ ] a coluna **"Archivado por"** mostra o nome, ou `—` quando o autor é desconhecido;
- [ ] as duas colunas aparecem **só** no modo arquivado (exceto nas telas 7 e 8, onde são fixas), na
      **mesma posição** de antes — antes da coluna de ações;
- [ ] a contagem do rodapé é a mesma de antes em cada modo;
- [ ] os botões de linha (ver, arquivar, restaurar) estão presentes e habilitados como antes;
- [ ] alternar ativo ↔ arquivado troca a lista, sem tela em branco e sem coluna fantasma.

- [ ] **Step 6: Prove o Q-14 — o contrato que o D4 protege**

Numa das 6 tabelas, force a falha do GET (DevTools → Network → Offline, ou pare o container `app`),
recarregue e clique **"Reintentar"**:

- [ ] o botão fica em **`loading`** enquanto o GET está em voo, e só então volta.

Faça isso **na tela de Turmas** especificamente: é a que passou a usar `useTurmasPage`, e é onde uma
regressão do `refetch` (promise engolida) apareceria — sem quebrar tipo nem teste.

- [ ] **Step 7: Prove a troca de idioma ao vivo**

Com uma tela de arquivados aberta, troque o idioma da interface no menu para **PT** e depois para
**EN**:

- [ ] a data da coluna muda de grafia junto com o resto da tela.

É o comportamento correto e o mesmo do resto da aplicação. Registre-o como está na §10 da spec: a
data exibida **não é carimbo imutável** — o carimbo de auditoria é o `archived_at` ISO no payload.

- [ ] **Step 8: Commit do fechamento**

Se algum ajuste saiu dos passos acima, comite-o. Se nada mudou, não force commit vazio — o gate é
prova, não artefato.

---

## Handoff de execução

```yaml
executor: claude
```

**Por que `claude` e não `codex`:** o critério do `/executar-bloco` manda `codex` para tasks
mecânicas com verificação executável e paths fechados. As Tasks 4-10 são exatamente isso — mas a
Task 11, que é o que **fecha** o bloco, não tem verificação executável: o aceite é a prova no
navegador com browser em `en-US` e interface em `es-CL`, nas 8 telas, mais a prova do Q-14 com o GET
falhando. Nenhum desses passos é comando com saída conferível.

Some-se a isso a §2 da spec: a forma errada da peça de colunas **não estoura**. Build, lint e suíte
passam enquanto a tela renderiza uma coluna lixo. Num bloco cujo DoD é "comportamento idêntico,
provado", entregar a execução a quem não vê a tela é entregar o gate que importa a ninguém.

Fatiar (Tasks 1-10 no Codex, Task 11 aqui) foi considerado e recusado: o handoff declara **um**
executor, e o corte cairia justamente entre escrever e provar.

**Ordem de execução:** as tasks são sequenciais. 1 → 2 → 3 são as peças; 4 → 10 são as adoções, e
qualquer uma delas depende das três primeiras. A Task 11 exige as dez anteriores.

**Ordem interna do bloco (D-53 antes de D-51), como o backlog declara:** ela está embutida na
sequência. `archivedColumns` (Task 2) já nasce com `formatDate` dentro, então cada adoção de tabela
paga os dois débitos ao mesmo tempo, e o D-51 fica com **um** sítio direto — a Task 10.
