# `frontend-arrumacao-de-testes` — Implementation Plan (item 27)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** arrumar a suíte de frontend como mecanismo — ambiente de execução, molde de montagem e as duas fichas de teste sem hospedeiro — sem tocar em uma única asserção de comportamento.

**Architecture:** `test.projects` separa o que confere o repositório (`tests/**`, `node`) do que monta componente (`src/**`, `jsdom`). `src/shared/testing/providers.tsx` vira a única construção de `QueryClient` em teste, com duas portas — `createWrapper` para os 24 arquivos de `renderHook` e `renderWithProviders` para os 9 de `render` —, e uma catraca de eslint impede a oitava grafia de nascer.

**Tech Stack:** vitest 4.1.10 · @testing-library/react · @tanstack/react-query · react-router-dom · eslint flat config.

**Spec:** [`specs/2026-09-03-frontend-arrumacao-de-testes-design.md`](../../specs/archive/2026-09-03-frontend-arrumacao-de-testes-design.md)

## Global Constraints

- **Todos os comandos rodam de `frontend/`.** O worktree é `../fix-frontend`, offset próprio no `.env` da raiz.
- **Linha de base a preservar:** `pnpm test` = **128 arquivos, 760 testes**. Qualquer variação nesses dois números é achado, não ajuste.
- **Nenhuma asserção muda.** Nenhum `it(` nasce ou morre nos 33 arquivos migrados. Os únicos arquivos que ganham caso novo são `tests/desmonte-global.test.ts` (Task 1), `src/shared/testing/providers.test.tsx` (Task 2, arquivo novo) e `tests/compose-dev.test.ts` (Task 7).
- **`git stash` é proibido nesta árvore.** A pilha é compartilhada com o main tree e outras worktrees. Sonda negativa se prova com cópia no scratchpad: `cp <arquivo> /tmp/claude-1000/-home-jvbat-projetos-fix-frontend/bde0a7b8-6f90-4253-baa5-c1068073fd73/scratchpad/` e restauração por `cp` de volta.
- **Lição 19 (`docs/README.md`):** `frontend/vite.config.ts` é guardado por `tests/desmonte-global.test.ts`. Mudança nele traz asserção nova **no mesmo commit**.
- **Default do client, verbatim da spec §4.2:** `{ queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } }`. **Sem `staleTime`.**
- **Fora de escopo:** `src/test-setup.ts`, régua da `P-74`, juntar os dois pares de arquivo (achado recusado, spec §4.5).

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `frontend/vite.config.ts` | **Modificar.** `test.projects` com `unit` (jsdom, `src/**`) e `repo` (node, `tests/**`) | 1 |
| `frontend/tests/desmonte-global.test.ts` | **Modificar.** Guarda do par setup/ambiente: passa a afirmar qual projeto declara o `setupFiles` e em que ambiente cada um roda | 1 |
| `frontend/src/shared/testing/providers.tsx` | **Criar.** Única construção de `QueryClient` em teste; `createWrapper` + `renderWithProviders` | 2 |
| `frontend/src/shared/testing/providers.test.tsx` | **Criar.** Prova o contrato do helper: client estável, router opcional, override | 2 |
| 19 arquivos de `src/features/*/{hooks,api}/` | **Modificar.** Trocam wrapper local por `createWrapper` | 3 |
| 4 de `src/shared/hooks/` + 1 de `src/app/pages/Dashboard/` | **Modificar.** Idem, e o de `app/` passa a receber o `client` do helper | 4 |
| 9 arquivos de `src/features/*/components/` | **Modificar.** Trocam `render(<X/>, { wrapper })` por `renderWithProviders` | 5 |
| `frontend/eslint.config.js` | **Modificar.** `QUERY_CLIENT_A_MAO` nos 5 arrays que já carregam `CLEANUP_A_MAO`, mais os dois blocos gêmeos de isenção | 6 |
| `frontend/tests/compose-dev.test.ts` | **Modificar.** Afasta também os `.env*` de `frontend/` (`P-58`) | 7 |

---

## Task 1: Ambiente por projeto, com a guarda no mesmo commit

**Files:**
- Modify: `frontend/vite.config.ts:57-70` (o bloco `test: { ... }`)
- Modify: `frontend/tests/desmonte-global.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: dois projetos vitest nomeados **`unit`** (jsdom, cobre `src/**/*.test.{ts,tsx}`, declara `setupFiles: ['./src/test-setup.ts']`) e **`repo`** (node, cobre `tests/**/*.test.{ts,tsx}`, sem `setupFiles`). Os nomes `unit` e `repo` são consumidos pelas asserções da guarda e por `pnpm test --project=<nome>` nas tasks seguintes.

- [ ] **Step 1: Escrever as asserções que ainda não passam**

Em `frontend/tests/desmonte-global.test.ts`, acrescentar o recorte de tipo e o novo `describe` **depois** do `describe` existente. Não apagar nada do que já está lá.

```ts
/** O recorte do config do Vite que este arquivo inspeciona. */
type ProjetoDeTeste = {
  test?: { name?: string; environment?: string; setupFiles?: string[]; include?: string[] }
}
type ConfigDeTeste = { test?: { projects?: ProjetoDeTeste[] } }

/**
 * O par que a guarda acima pressupõe, depois que a suíte passou a rodar em
 * dois projetos (item 27).
 *
 * A asserção de texto do `setupFiles` casa a linha em QUALQUER lugar do
 * arquivo. Com `projects`, isso deixou de provar o que provava: um
 * `setupFiles` declarado no projeto `repo` passaria a régua e deixaria todo o
 * `src/**` sem desmonte — que é exatamente o buraco que a P-69 fechou. Estas
 * asserções ligam o setup ao projeto CERTO.
 *
 * O molde de carregar a fábrica é o do `compose-dev.test.ts`, que já a chama
 * para inspecionar `server.port` e `define`.
 */
describe('separação de ambientes por projeto (item 27)', () => {
  async function projetos(): Promise<ProjetoDeTeste[]> {
    const { default: fabrica } = await import('../vite.config')
    expect(typeof fabrica).toBe('function')
    const config = (await fabrica({ command: 'serve', mode: 'development' })) as ConfigDeTeste
    const lista = config.test?.projects
    expect(Array.isArray(lista)).toBe(true)
    return lista as ProjetoDeTeste[]
  }

  const acharProjeto = (lista: ProjetoDeTeste[], nome: string) =>
    lista.find((projeto) => projeto.test?.name === nome)

  it('o projeto que cobre `src/**` roda em jsdom e é quem declara o setup', async () => {
    const unit = acharProjeto(await projetos(), 'unit')
    expect(unit).toBeDefined()
    expect(unit?.test?.environment).toBe('jsdom')
    expect(unit?.test?.setupFiles).toEqual(['./src/test-setup.ts'])
    expect(unit?.test?.include).toEqual(['src/**/*.test.{ts,tsx}'])
  })

  it('o projeto que cobre `tests/**` roda em node e NÃO declara setup', async () => {
    const repo = acharProjeto(await projetos(), 'repo')
    expect(repo).toBeDefined()
    expect(repo?.test?.environment).toBe('node')
    expect(repo?.test?.setupFiles).toBeUndefined()
    expect(repo?.test?.include).toEqual(['tests/**/*.test.{ts,tsx}'])
  })

  it('este arquivo está de fato rodando sem DOM', () => {
    // A prova de comportamento, e não de declaração: se `tests/` voltar para
    // jsdom, `document` existe e este caso reprova. É o par de runtime das
    // duas asserções estruturais acima.
    expect(typeof document).toBe('undefined')
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `pnpm test tests/desmonte-global.test.ts`

Expected: **FAIL**, 3 casos novos reprovando. Os dois primeiros com `expected true to be false` no `Array.isArray(lista)` (ainda não há `projects`); o terceiro com `expected 'object' to be 'undefined'` (o arquivo ainda roda em jsdom). Os 2 casos antigos continuam passando.

- [ ] **Step 3: Trocar o bloco `test` do vite.config**

Em `frontend/vite.config.ts`, substituir o objeto `test: { ... }` inteiro (o que hoje declara `environment`, `setupFiles` e `include`) por:

```ts
    // DOIS projetos, desde 2026-09-03 (item 27). `tests/` só lê o repositório
    // com `readFileSync` — medido: 11 de 11 arquivos, ZERO tocando `render(`,
    // `document` ou `window` — e `environment` era o maior item do tempo da
    // suíte (121,39s de 96,68s de parede, somados entre workers).
    //
    // `extends: true` no `unit` NÃO é decoração: sem ele o projeto perde os
    // `resolve.alias` (`@shared`, `@features`) e o plugin do React, e todo
    // `src/**` deixa de compilar. O `repo` fica sem `extends` de propósito —
    // ele não usa alias nem JSX, e herdar plugin é transform que ninguém lê.
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            // COM `setupFiles`, desde 2026-09-02 (P-69): o `afterEach(cleanup)`
            // do Testing Library era grafia manual em 62 dos 127 arquivos, e o
            // desmonte dependia de quem copiava o molde de quem. O par que
            // sustenta a decisão é a catraca `CLEANUP_A_MAO` (eslint.config.js)
            // mais a guarda `tests/desmonte-global.test.ts`, que confere que
            // ESTA linha existe e que ela mora NESTE projeto.
            setupFiles: ['./src/test-setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
          },
        },
        {
          test: {
            name: 'repo',
            environment: 'node',
            // `tests/` fica fora de `src/` porque o que ele confere é o
            // REPOSITÓRIO, não a app: o container `app` monta só `./backend` e
            // `./frontend`, então o vitest é o único runner do projeto com
            // acesso à raiz. E por isso mesmo roda em `node`: não há DOM a
            // montar, só arquivo a ler.
            include: ['tests/**/*.test.{ts,tsx}'],
          },
        },
      ],
    },
```

O comentário `// Sem 'globals': cada teste importa describe/it/expect de 'vitest'...` que hoje precede o bloco `test` continua onde está, acima dele.

- [ ] **Step 4: Rodar a guarda e ver passar**

Run: `pnpm test --project=repo tests/desmonte-global.test.ts`

Expected: **PASS**, 5 casos (2 antigos + 3 novos).

- [ ] **Step 5: Rodar a suíte inteira e conferir os dois números**

Run: `pnpm test 2>&1 | tail -8`

Expected: `Test Files  128 passed (128)` e `Tests  760 passed (760)`. Anotar a linha `Duration` inteira — ela entra no fechamento como a medição "depois".

Se qualquer um dos dois números divergir, **PARE**: um `include` mal recortado deixa arquivo sem rodar, e a suíte fica verde por ausência. Compare `pnpm test --project=unit` (esperado: 117 arquivos) com `pnpm test --project=repo` (esperado: 11).

- [ ] **Step 6: Commit**

```bash
git add frontend/vite.config.ts frontend/tests/desmonte-global.test.ts
git commit -m "test(vitest): tests/ roda em node e src/ em jsdom, com a guarda no mesmo commit"
```

---

## Task 2: A home única de montagem

**Files:**
- Create: `frontend/src/shared/testing/providers.tsx`
- Create: `frontend/src/shared/testing/providers.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type ProviderOptions = { route?: string; queryClientOptions?: QueryClientConfig }`
  - `createWrapper(opts?: ProviderOptions): { wrapper: ({ children }: { children: ReactNode }) => ReactElement; client: QueryClient }`
  - `renderWithProviders(ui: ReactElement, opts?: ProviderOptions): RenderResult & { client: QueryClient }`

  As Tasks 3, 4 e 5 consomem exatamente esses três nomes, importados de `@shared/testing/providers`.

- [ ] **Step 1: Escrever o teste do contrato**

Create `frontend/src/shared/testing/providers.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { renderHook, screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { createWrapper, renderWithProviders } from './providers'

describe('providers de teste', () => {
  it('devolve o MESMO client entre re-renders', () => {
    // O defeito que a home fecha: 20 dos 24 wrappers locais construíam o
    // client DENTRO do componente wrapper, então cada re-render descartava o
    // cache junto.
    const { wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useQueryClient(), { wrapper })
    const primeiro = result.current
    rerender()
    expect(result.current).toBe(primeiro)
  })

  it('devolve ao chamador o mesmo client que injeta', () => {
    const { wrapper, client } = createWrapper()
    const { result } = renderHook(() => useQueryClient(), { wrapper })
    expect(result.current).toBe(client)
  })

  it('o default desliga retry nos dois eixos e o refetch por foco', () => {
    const { client } = createWrapper()
    const padrao = client.getDefaultOptions()
    expect(padrao.queries?.retry).toBe(false)
    expect(padrao.queries?.refetchOnWindowFocus).toBe(false)
    expect(padrao.mutations?.retry).toBe(false)
  })

  it('NÃO fixa staleTime', () => {
    // `staleTime` é sujeito de teste em `useDashboard.test.tsx`, que declara
    // por escrito que a página é quem o passa. Um default aqui apagaria o
    // sujeito daquele arquivo.
    expect(createWrapper().client.getDefaultOptions().queries?.staleTime).toBeUndefined()
  })

  it('aceita override e o override substitui o default', () => {
    const { client } = createWrapper({
      queryClientOptions: { defaultOptions: { queries: { retry: 3 } } },
    })
    expect(client.getDefaultOptions().queries?.retry).toBe(3)
  })

  it('sem `route`, não monta router', () => {
    function Sonda() {
      return <span data-testid="sonda">montou</span>
    }
    renderWithProviders(<Sonda />)
    expect(screen.getByTestId('sonda')).toBeTruthy()
  })

  it('com `route`, monta o MemoryRouter naquela entrada', () => {
    function Rota() {
      return <span data-testid="rota">{useLocation().pathname}</span>
    }
    renderWithProviders(<Rota />, { route: '/validar/abc' })
    expect(screen.getByTestId('rota').textContent).toBe('/validar/abc')
  })

  it('devolve o client também no render', () => {
    const { client } = renderWithProviders(<span />)
    expect(typeof client.getQueryCache).toBe('function')
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `pnpm test --project=unit src/shared/testing/providers.test.tsx`

Expected: **FAIL** com `Failed to resolve import "./providers"` — o módulo ainda não existe.

- [ ] **Step 3: Escrever o helper**

Create `frontend/src/shared/testing/providers.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider, type QueryClientConfig } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render, type RenderResult } from '@testing-library/react'

/**
 * A ÚNICA construção de `QueryClient` em teste (item 27).
 *
 * Eram 33 arquivos e SETE grafias — 17 com os dois eixos de `retry`, 7 só com
 * `mutations`, 5 só com `queries`, 5 acrescentando `refetchOnWindowFocus` e
 * um declarando por escrito que `staleTime` não entra. Vinte dos 24 wrappers
 * locais construíam o client DENTRO do componente, então o cache morria a
 * cada re-render.
 *
 * Duas portas para um mecanismo: `createWrapper` serve os 24 arquivos de
 * `renderHook` (que querem um `wrapper`), `renderWithProviders` serve os 9 de
 * `render` (que querem a tela montada).
 *
 * A catraca `QUERY_CLIENT_A_MAO` (eslint.config.js) é o par que impede a
 * oitava grafia de nascer; este arquivo é o único isento dela em `shared/`.
 */

export type ProviderOptions = {
  /** Quando presente, monta `MemoryRouter` com esta entrada inicial. */
  route?: string
  /** Substitui o default POR INTEIRO — não é merge. */
  queryClientOptions?: QueryClientConfig
}

/**
 * Sem `staleTime`, de propósito: é sujeito de teste em
 * `src/app/pages/Dashboard/useDashboard.test.tsx`, que mede justamente o que a
 * página passa. Fixá-lo aqui provaria o client, não a página.
 */
const PADRAO: QueryClientConfig = {
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
}

/**
 * Nasce sem consumidor, e é intencional: a catraca fecha `new QueryClient` em
 * todo teste das três camadas, então um caso futuro que precise de outra
 * opção precisa de uma porta — sem ela, a saída seria furar a catraca.
 */
export function createWrapper(opts: ProviderOptions = {}): {
  wrapper: ({ children }: { children: ReactNode }) => ReactElement
  client: QueryClient
} {
  // FORA do componente: é o que mantém o cache vivo entre re-renders.
  const client = new QueryClient(opts.queryClientOptions ?? PADRAO)
  const { route } = opts

  function wrapper({ children }: { children: ReactNode }) {
    const comQuery = <QueryClientProvider client={client}>{children}</QueryClientProvider>
    return route === undefined ? comQuery : <MemoryRouter initialEntries={[route]}>{comQuery}</MemoryRouter>
  }

  return { wrapper, client }
}

export function renderWithProviders(
  ui: ReactElement,
  opts: ProviderOptions = {},
): RenderResult & { client: QueryClient } {
  const { wrapper, client } = createWrapper(opts)
  return { ...render(ui, { wrapper }), client }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test --project=unit src/shared/testing/providers.test.tsx`

Expected: **PASS**, 8 casos.

- [ ] **Step 5: Conferir que o arquivo novo não estoura régua nem lint**

Run: `pnpm lint && pnpm build`

Expected: lint com **0** problemas, build verde. (`src/shared/**` não tem `max-lines`; a régua de 150 é de `features/*/components/**` e `app/**`.)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/testing/providers.tsx frontend/src/shared/testing/providers.test.tsx
git commit -m "test(shared): a montagem de provedor de teste ganha home unica"
```

---

## Task 3: Migrar os 19 de `hooks/`+`api/` de features

**Files:** Modify (19, todos `renderHook`):
- `src/features/identity/hooks/` — 8 arquivos
- `src/features/operation/hooks/` — 4
- `src/features/commercial/hooks/` — 2
- `src/features/certification/hooks/` — 2
- `src/features/catalog/hooks/` — 1
- `src/features/identity/api/useStudentDetail.test.tsx` — 1
- `src/features/certification/api/certificatesApi.test.tsx` — 1

Lista exata: `grep -rln 'new QueryClient' src/features --include='*.test.tsx' | grep -v '/components/'`

**Interfaces:**
- Consumes: `createWrapper` de `@shared/testing/providers` (Task 2).
- Produces: nada que tasks posteriores consumam.

- [ ] **Step 1: Migrar um arquivo e conferir o molde**

Comece por um dos 8 de `src/features/identity/hooks/`. A troca é sempre a mesma forma:

**Antes:**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
```

**Depois:**
```tsx
import { createWrapper } from '@shared/testing/providers'

const { wrapper } = createWrapper()
```

As chamadas `renderHook(..., { wrapper })` **não mudam** — o nome `wrapper` é o mesmo. Apagar os imports que ficaram órfãos (`QueryClient`, `QueryClientProvider`, e `ReactNode` se não for usado em mais nada no arquivo).

Run: `pnpm test --project=unit <o arquivo migrado>`

Expected: PASS, com a mesma contagem de casos de antes.

- [ ] **Step 2: Migrar os 18 restantes, um a um**

Mesma forma do Step 1. Três desvios a tratar quando aparecerem, e **nenhum deles muda asserção**:

1. **Arquivo que declara só um eixo** (`{ queries: { retry: false } }` ou `{ mutations: { retry: false } }`): passa a ter os dois, vindos do default. Não é override — é o default da spec (D2).
2. **Arquivo com `refetchOnWindowFocus: false`**: também vem do default. Apagar a opção local.
3. **Arquivo com `const Wrapper = ({ children }) => (...)`** (a grafia de 5 dos 24): mesma troca; renomeie o consumo para `wrapper` se o sítio usava `Wrapper`.

Se algum arquivo montar `MemoryRouter` além do provider, passe a rota: `createWrapper({ route: '<a rota que ele já usava>' })`.

- [ ] **Step 3: Conferir que nenhum sobrou**

Run: `grep -rln 'new QueryClient' src/features --include='*.test.tsx' | grep -v '/components/'`

Expected: **saída vazia**.

- [ ] **Step 4: Rodar a fatia e conferir a contagem**

Run: `pnpm test --project=unit src/features 2>&1 | tail -6`

Expected: verde, e o total de casos de `src/features` **idêntico** ao de antes da task — nenhum `it(` nasceu ou morreu. Para comparar sem mexer no working tree, rode o mesmo comando num `git worktree add` descartável sobre o commit anterior, **nunca** com `git stash`.

- [ ] **Step 5: Commit**

```bash
git add src/features
git commit -m "test(features): os 19 testes de hook consomem a home de provedores"
```

---

## Task 4: Migrar os 5 de `shared/` e `app/`

**Files:** Modify:
- `frontend/src/shared/hooks/useServerTable.test.tsx`
- `frontend/src/shared/hooks/useEntityPhoto.test.tsx`
- `frontend/src/shared/hooks/useCrudFormWithPhoto.test.tsx`
- `frontend/src/shared/hooks/useBlobTabOpener.test.tsx`
- `frontend/src/app/pages/Dashboard/useDashboard.test.tsx`

**Interfaces:**
- Consumes: `createWrapper` de `@shared/testing/providers` (Task 2).
- Produces: nada.

- [ ] **Step 1: Migrar os 4 de `shared/hooks/`**

Mesma forma da Task 3. Atenção a `useServerTable.test.tsx`, que compõe `PageMeta` dentro do wrapper: a composição própria **fica**, com `createWrapper` por dentro —

```tsx
const { wrapper: comQuery } = createWrapper()

function wrapper({ children }: { children: ReactNode }) {
  return comQuery({ children: <PageMeta>{children}</PageMeta> })
}
```

Run: `pnpm test --project=unit src/shared/hooks`
Expected: PASS, mesma contagem de antes.

- [ ] **Step 2: Migrar `useDashboard.test.tsx`, que USA o client depois de montar**

Este arquivo chama `qc.refetchQueries()` em duas linhas. O client passa a vir do helper, e **não** de um `new QueryClient` local:

```tsx
const { wrapper, client: qc } = createWrapper()
```

As duas linhas `await qc.refetchQueries()` ficam intactas. Se o arquivo declarava `staleTime` de propósito no client (é o caso comentado da spec §3.3), **confira que a asserção que depende disso continua verde** — o default do helper não fixa `staleTime`, então o comportamento é o mesmo de antes.

- [ ] **Step 3: Conferir que nenhum sobrou**

Run: `grep -rln 'new QueryClient' src --include='*.test.tsx'`

Expected: exatamente os **9** arquivos de `src/features/*/components/` — eles são a Task 5 e ainda estão de pé. Qualquer outro caminho na lista é arquivo que esta task ou a anterior deixou para trás. A saída só fica vazia depois da Task 5.

- [ ] **Step 4: Rodar as duas camadas**

Run: `pnpm test --project=unit src/shared src/app 2>&1 | tail -6`
Expected: verde, mesma contagem de casos de antes da task.

- [ ] **Step 5: Commit**

```bash
git add src/shared/hooks src/app
git commit -m "test(shared,app): os 5 testes restantes de hook consomem a home"
```

---

## Task 5: Migrar os 9 de `features/*/components/`

**Files:** Modify (os 9 que usam `render`, não `renderHook`):
- `src/features/identity/components/` — 5 arquivos
- `src/features/certification/components/` — 3
- `src/features/operation/components/` — 1

Lista exata: `grep -rln 'new QueryClient' src/features/*/components --include='*.test.tsx'`

**Interfaces:**
- Consumes: `renderWithProviders` e `createWrapper` de `@shared/testing/providers` (Task 2).
- Produces: nada.

- [ ] **Step 1: Migrar os que só têm provider**

**Antes:**
```tsx
render(
  <QueryClientProvider client={qc}>
    <StudentCertificateCell {...props} />
  </QueryClientProvider>,
)
```

**Depois:**
```tsx
renderWithProviders(<StudentCertificateCell {...props} />)
```

- [ ] **Step 2: Migrar os que têm provider + `MemoryRouter`**

A rota que o arquivo já usava vira parâmetro, e continua visível no sítio:

**Antes:**
```tsx
render(
  <MemoryRouter initialEntries={['/validar/abc']}>
    <QueryClientProvider client={qc}>
      <ValidationPage />
    </QueryClientProvider>
  </MemoryRouter>,
)
```

**Depois:**
```tsx
renderWithProviders(<ValidationPage />, { route: '/validar/abc' })
```

Onde a entrada vem de variável (`initialEntries={[entry]}`), passe a variável: `{ route: entry }`.

- [ ] **Step 3: Tratar os 2 com `<Routes>/<Route>`**

Árvore de rota **não** vira parâmetro (spec §2). Estes mantêm a topologia própria e consomem o helper por dentro:

```tsx
renderWithProviders(
  <Routes>
    <Route path="/comercial/presupuestos/:id" element={<BudgetDetailPage />} />
  </Routes>,
  { route: '/comercial/presupuestos/1' },
)
```

- [ ] **Step 4: Conferir que nenhum sobrou, em lugar nenhum**

Run: `grep -rln 'new QueryClient' src --include='*.test.ts' --include='*.test.tsx'`

Expected: **saída vazia**. Este é o DoD 4 da spec.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `pnpm test 2>&1 | tail -8`

Expected: `Test Files  129 passed (129)` e `Tests  771 passed (771)`.

A conta: 128 + 1 arquivo (`providers.test.tsx`, Task 2) = **129**; 760 + 8 casos daquele arquivo + 3 casos que a Task 1 acrescentou ao `desmonte-global.test.ts` = **771**. Os 33 arquivos migrados não somam nem perdem um `it(` — só os arquivos de mecanismo crescem.

Se der outro número, PARE e reparta: `pnpm test --project=unit` (esperado: 118 arquivos) e `--project=repo` (11).

- [ ] **Step 6: Commit**

```bash
git add src/features
git commit -m "test(features): os 9 testes de componente consomem renderWithProviders"
```

---

## Task 6: A catraca `QUERY_CLIENT_A_MAO`

**Files:**
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: `src/shared/testing/providers.tsx` existindo (Task 2) e os 33 sítios já migrados (Tasks 3–5).
- Produces: nada.

**Por que não um bloco novo só para teste:** o próprio arquivo registra que flat config faz **merge raso** de `rules` — dois blocos que casam o mesmo arquivo e declaram a mesma regra, o último apaga o primeiro por inteiro. Um bloco `files: ['src/**/*.test.tsx']` com `no-restricted-syntax` desligaria em silêncio todas as outras proibições nos arquivos de teste. A catraca entra **nos 5 arrays que já carregam `CLEANUP_A_MAO`**, que juntos cobrem os 33 sítios (medido: os 33 são `.tsx`).

- [ ] **Step 1: Declarar a catraca e a lista de isenção**

Em `frontend/eslint.config.js`, logo abaixo da const `CLEANUP_A_MAO` (por volta da linha 281):

```js
// Item 27: a montagem de provedor em teste tem UMA casa
// (`src/shared/testing/providers.tsx`). Eram 33 arquivos e SETE grafias, e 20
// dos 24 wrappers locais construíam o client dentro do componente — cache
// morto a cada re-render.
//
// Nas TRÊS camadas, e não nas duas que a ficha do item pedia: `shared/` tinha
// 4 dos 33 sítios, e camada descoberta é por onde o defeito volta. Foi assim
// que a P-67 voltou, por grafia que a catraca não alcançava.
//
// O que ela NÃO pega, dito para ninguém supor cobertura que não existe:
// apelido (`const C = QueryClient; new C()`). Casa grafia, não origem — mesmo
// limite do `CLEANUP_A_MAO` e do `DROPDOWN_SEM_NOME`.
const QUERY_CLIENT_A_MAO = {
  selector: 'NewExpression[callee.name="QueryClient"]',
  message:
    'Client à mão: use `createWrapper()` ou `renderWithProviders()` de `@shared/testing/providers` (item 27). Precisa de opção diferente? Passe `queryClientOptions` — o desvio fica visível no sítio.',
}

// Os DOIS arquivos que constroem `QueryClient` legitimamente: a aplicação e a
// própria home de teste. Particionam os globs de `shared/` e `app/` pelo mesmo
// molde do `FORA_DO_CAMPO_LIGADO` — sem o bloco gêmeo abaixo, o `ignores`
// diria "NENHUMA régua vale aqui" em vez de "esta régua não vale aqui".
const CONSTROEM_QUERY_CLIENT = [
  'src/app/providers/AppProviders.tsx',
  'src/shared/testing/providers.tsx',
]
```

- [ ] **Step 2: Acrescentar a catraca aos 5 arrays**

Nos 5 arrays de `no-restricted-syntax` que hoje terminam em `CLEANUP_A_MAO` (linhas ~594, ~605, ~626, ~811, ~845), acrescente `, QUERY_CLIENT_A_MAO` logo depois dele.

Nos dois blocos de camada que casam os arquivos de produção — `files: ['src/shared/**/*.tsx']` (~809) e `files: ['src/app/**/*.tsx']` (~843) — acrescente também o `ignores`:

```js
    ignores: [...CONSTROEM_QUERY_CLIENT],
```

- [ ] **Step 3: Criar os dois blocos gêmeos**

Imediatamente após cada um dos dois blocos acima, o gêmeo com o **mesmo array menos `QUERY_CLIENT_A_MAO`**. Sem eles, o `ignores` desligaria todas as outras regras nesses dois arquivos.

Gêmeo de `src/shared/**/*.tsx`:
```js
  // Gêmeo do bloco acima para os dois arquivos que constroem `QueryClient` de
  // verdade: MESMO array, menos `QUERY_CLIENT_A_MAO`. Mesmo molde do gêmeo de
  // `FORA_DO_CAMPO_LIGADO`.
  {
    files: ['src/shared/testing/providers.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, DISABLED_READONLY, DISABLED_READONLY_ESTATICO, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, CLEANUP_A_MAO],
    },
  },
```

Gêmeo de `src/app/**/*.tsx`:
```js
  {
    files: ['src/app/providers/AppProviders.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, DROPDOWN_SEM_NOME, BOTAO_SEM_PAPEL, ...GRAFIA_LITERAL, ...MONO_LITERAL, ...RAIO_LITERAL, CLEANUP_A_MAO],
    },
  },
```

Se o array do bloco de origem tiver mudado desde a escrita deste plano, **copie o array vigente**, não este — o gêmeo tem de espelhar o bloco que particiona.

- [ ] **Step 4: Rodar o lint e ver verde**

Run: `pnpm lint`

Expected: **0 problemas**. Se acusar em `AppProviders.tsx` ou `providers.tsx`, o gêmeo ou o `ignores` está errado.

- [ ] **Step 5: Sonda negativa — ver a catraca reprovar**

Cobertura fantasma (lição 10): catraca que ninguém viu morder não prova nada.

```bash
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-fix-frontend/bde0a7b8-6f90-4253-baa5-c1068073fd73/scratchpad
ALVO=src/features/identity/components/Student/StudentCertificateCell.test.tsx
cp "$ALVO" "$SCRATCH/sonda-query-client.bak"
```

Reintroduza a grafia antiga no alvo — uma linha basta:

```tsx
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
```

Run: `pnpm lint 2>&1 | grep -c QUERY_CLIENT_A_MAO` — na prática, `pnpm lint` e leia a mensagem.

Expected: **FAIL**, com a mensagem `Client à mão: use createWrapper()...` no arquivo alvo.

Restaurar **por `cp`, nunca por `git stash`** (a pilha é compartilhada entre árvores):

```bash
cp "$SCRATCH/sonda-query-client.bak" "$ALVO"
git diff --stat -- "$ALVO"   # esperado: vazio
```

Repita a sonda em `src/shared/hooks/useEntityPhoto.test.tsx` e em `src/app/pages/Dashboard/useDashboard.test.tsx` — as outras duas camadas. Uma camada não provada é uma camada não coberta.

- [ ] **Step 6: Lint verde de novo e commit**

Run: `pnpm lint && pnpm test 2>&1 | tail -6`
Expected: 0 problemas; 129 arquivos / 771 testes.

```bash
git add frontend/eslint.config.js
git commit -m "lint(catraca): QUERY_CLIENT_A_MAO fecha a construcao de client em teste"
```

---

## Task 7: A `P-58`

**Files:**
- Modify: `frontend/tests/compose-dev.test.ts:200-250` (a região de `NOMES_ENV_DA_RAIZ`, `CAMINHOS_ENV` e as funções de afastar/restaurar)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

**O defeito, medido:** o `beforeEach` afasta os quatro `.env*` da **raiz**, mas o `vite.config.ts` também chama `loadEnv(mode, __dirname, 'VITE_')` — que lê `frontend/.env`. Árvore com `VITE_API_URL` legado no disco reprova 3 casos com `expected undefined to be '"http://localhost:8080"'`. O config está certo; quem não isola é o teste.

- [ ] **Step 1: Escrever o caso que reprova hoje**

Acrescentar ao `describe` que já existe:

```ts
  it('ignora um `frontend/.env` com VITE_API_URL legado no disco', async () => {
    // A P-58: o `beforeEach` afastava só os `.env*` da RAIZ, e o
    // `vite.config.ts` também lê `frontend/.env` por
    // `loadEnv(mode, __dirname, 'VITE_')`. Numa árvore com a grafia antiga no
    // disco, três casos deste arquivo reprovavam por ambiente, não por código.
    writeFileSync(join(RAIZ, 'frontend', '.env'), 'VITE_API_URL=http://localhost:9999\n', 'utf8')
    plantados.add('frontend/.env')
    const config = await carregar('serve')
    expect(config.define?.['import.meta.env.VITE_API_URL']).toBe('"http://localhost:8080"')
  })
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `pnpm test --project=repo tests/compose-dev.test.ts`

Expected: **FAIL** no caso novo, com `expected undefined to be '"http://localhost:8080"'` — que é exatamente a linha da ficha `P-58`. O `plantados.add` com uma chave que o mecanismo atual não conhece também deixa o arquivo no disco; o Step 3 conserta os dois.

- [ ] **Step 3: Estender o mecanismo às duas raízes**

`loadEnv` com `mode: 'development'` lê os mesmos quatro nomes em cada diretório. A lista passa a ser gerada para as duas, e a **chave vira o caminho relativo**, não o nome — senão `.env` da raiz e `.env` de `frontend/` colidiriam em `plantados` e `backupsPendentes`.

```ts
  const NOMES_ENV = ['.env', '.env.local', '.env.development', '.env.development.local'] as const
  /**
   * As DUAS raízes que o `vite.config.ts` lê: `loadEnv(mode, RAIZ, 'LOTUS_')`
   * para o offset de portas e `loadEnv(mode, __dirname, 'VITE_')` para saber se
   * `VITE_API_URL` já está definido. Afastar só a primeira deixava o gate
   * dependendo do disco de quem roda — era a P-58, medida em 2026-08-24.
   */
  const DIRETORIOS_ENV = [
    { chave: '', base: RAIZ },
    { chave: 'frontend/', base: join(RAIZ, 'frontend') },
  ] as const
  const ENV_DA_RAIZ = join(RAIZ, '.env')
  const CAMINHOS_ENV = DIRETORIOS_ENV.flatMap(({ chave, base }) =>
    NOMES_ENV.map((nome) => ({
      nome: `${chave}${nome}`,
      real: join(base, nome),
      backup: join(base, `${nome}.backup-do-teste`),
    })),
  )
```

`plantarEnvDaRaiz` continua marcando `plantados.add('.env')` — a chave da raiz não ganhou prefixo. As funções `afastarEnvReal`, `restaurarEnvReal` e `restaurarTodosOsEnvsDaRaiz` **não mudam**: já operam sobre `caminho.nome`/`caminho.real`/`caminho.backup`.

- [ ] **Step 4: Conferir o `.gitignore`**

O backup da raiz já está ignorado (`*.backup-do-teste`). Confirme que o padrão alcança `frontend/`:

Run: `git check-ignore -v frontend/.env.backup-do-teste`
Expected: uma linha citando a regra que o ignora. Se não sair nada, acrescente `*.backup-do-teste` ao `.gitignore` **nesta task**: backup órfão de `frontend/.env` num `git add -A` é o estrago que a rede de segurança do arquivo existe para evitar.

- [ ] **Step 5: Rodar e ver passar, com o legado no disco**

```bash
echo 'VITE_API_URL=http://localhost:8080' > frontend/.env.p58-sonda
mv frontend/.env frontend/.env.guardado 2>/dev/null || true
mv frontend/.env.p58-sonda frontend/.env
pnpm test --project=repo tests/compose-dev.test.ts
```

Expected: **PASS**, todos os casos — inclusive os 3 que a ficha diz reprovarem nessa condição.

Devolver o disco:
```bash
rm -f frontend/.env
mv frontend/.env.guardado frontend/.env 2>/dev/null || true
git status --porcelain frontend/   # esperado: só os arquivos da task
```

- [ ] **Step 6: Commit**

```bash
git add frontend/tests/compose-dev.test.ts
git commit -m "test(compose): a catraca do vite isola tambem o frontend/.env (P-58)"
```

---

## Task 8: Medir o depois e fechar o DoD

**Files:** nenhum de código.

**Interfaces:**
- Consumes: tudo das Tasks 1–7.
- Produces: a medição que o `/fechar-sprint` registra.

- [ ] **Step 1: Suíte completa, com o tempo**

Run: `pnpm test 2>&1 | tail -8`

Expected: `Test Files  129 passed (129)`, `Tests  771 passed (771)`, e a linha `Duration` inteira. Anotar `Duration` e o item `environment` — a base é **96,68s de parede / 121,39s de environment** (spec §3.1).

- [ ] **Step 2: Provar a separação por projeto**

```bash
pnpm test --project=unit 2>&1 | tail -4
pnpm test --project=repo 2>&1 | tail -4
```

Expected: `unit` com **118 arquivos**, `repo` com **11**. Soma = 129.

- [ ] **Step 3: Provar o DoD 4 (a home é única)**

```bash
grep -rln 'new QueryClient' src --include='*.test.ts' --include='*.test.tsx'   # esperado: vazio
grep -rl 'new QueryClient' src | sort                                          # esperado: 2 linhas
```

Expected: a primeira saída vazia; a segunda exatamente `src/app/providers/AppProviders.tsx` e `src/shared/testing/providers.tsx`.

- [ ] **Step 4: Lint e build**

Run: `pnpm lint && pnpm build`
Expected: 0 problemas; build verde.

- [ ] **Step 5: Provar o N/A por escopo**

Run: `git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
Expected: **saída vazia** — `pint` e `typescript:transform` são N/A por escopo, provado e não presumido.

- [ ] **Step 6: Suíte do backend**

Run: `docker compose up -d && docker compose exec -T app php artisan test 2>&1 | tail -5`
Expected: **1175 passed / 5 skipped** — o número que a `main` mede desde o item 26. Se o Docker não estiver de pé no host, registre N/A por escopo medido com a medição verde mais recente, como o fechamento do item 19 fez.

---

## Self-review

**Cobertura da spec:** §4.1 → Task 1 · §4.2 → Task 2 · §4.3 → Tasks 3, 4, 5 · §4.4 → Task 6 · §4.5 → nenhuma task, **de propósito**: o veredito é zero mudança de código e já está escrito na spec §4.5 · §4.6 → Task 7 · DoD 1–9 → Task 8, com o 3 provado na Task 1 Step 4 (o caso `typeof document === 'undefined'`) e o 5 na Task 6 Step 5.

**Consistência de nomes:** `createWrapper` e `renderWithProviders` aparecem com a mesma assinatura na Task 2 (definição) e nas Tasks 3, 4 e 5 (consumo). `ProviderOptions.route` e `.queryClientOptions` idem. Os nomes de projeto `unit`/`repo` são fixados na Task 1 e usados em `--project=` nas Tasks 2, 5, 7 e 8.

**Correção de conta, aplicada inline:** a Task 5 Step 5 e a Task 8 esperam **129 arquivos / 771 testes**, não os 128/760 da base — a Task 2 acrescenta 1 arquivo com 8 casos e a Task 1 acrescenta 3 casos ao `desmonte-global.test.ts`. A restrição global "128/760" vale para os **33 arquivos migrados**, que não ganham nem perdem caso; o total da suíte cresce só pelos arquivos de mecanismo. Onde as duas contas se encontram é no Step 2 da Task 8: `unit` 118 (117 + `providers.test.tsx`) e `repo` 11 (inalterado).

---

## Handoff de execução

**`executor: claude`.**

Não é task mecânica de paths fechados. A Task 3 migra 19 arquivos cujo desvio de opção precisa de julgamento caso a caso; a Task 1 mexe em arquivo guardado por catraca, o que a lição 19 obriga a tratar no mesmo commit; a Task 6 exige sonda negativa vista reprovar nas três camadas, que é prova de comportamento e não passo verificável por script; e a Task 7 mexe no isolamento de disco de um teste que a própria suíte usa para se proteger.
