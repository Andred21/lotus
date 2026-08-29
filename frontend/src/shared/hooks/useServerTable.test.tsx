import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Page, PageMeta } from '@shared/api/page'
import { SERVER_TABLE_DEBOUNCE_MS, useServerTable } from './useServerTable'

interface Row {
  id: number
  name: string
}

/** Cliente estável por teste, fora da função de render (padrão `comCliente()`
 * de `useTurmasPage.test.tsx`). Repete o default do `AppProviders`
 * (`refetchOnWindowFocus: false`) para o hook não herdar o do TanStack. */
function comCliente() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, Wrapper }
}

const meta = (over: Partial<PageMeta> = {}): PageMeta => ({
  page: 1, per_page: 10, total: 2, last_page: 1, total_unfiltered: 2, ...over,
})

const pagina = (rows: Row[], m: Partial<PageMeta> = {}): Page<Row> => ({ data: rows, meta: meta(m) })

const linhas: Row[] = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bruno' },
]

/* `cleanup()` antes de devolver os timers reais: o hook fica montado com o
 * `setTimeout` do debounce agendado, e ele dispara DEPOIS que o vitest destrói
 * o jsdom do arquivo — `ReferenceError: window is not defined`, que reprova a
 * rodada inteira sem reprovar teste nenhum. O repositório não tem `setupFiles`,
 * então o cleanup é por arquivo, como em `AppCard.test.tsx`. */
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useServerTable — a query que sai', () => {
  it('monta page/per_page sem q, sort nem filtro vazio, e devolve as linhas do envelope', async () => {
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas)))
    const { Wrapper } = comCliente()

    const { result } = renderHook(
      () => useServerTable(fetchPage, { key: ['x'], filters: { status: null } }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, per_page: 10 })
    expect(result.current.totalRecords).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('onPage pede a página certa a partir de first', async () => {
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(2))

    act(() => result.current.onPage({ first: 20 }))

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, per_page: 10 }))
    expect(result.current.first).toBe(20)
  })

  it('digitar não busca a cada tecla: um GET depois do debounce, com q, na página 1', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchPage).toHaveBeenCalledTimes(1)

    act(() => result.current.onPage({ first: 20 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchPage).toHaveBeenCalledTimes(2)

    act(() => result.current.onFilterChange('a'))
    act(() => result.current.onFilterChange('an'))
    act(() => result.current.onFilterChange('ana '))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS - 1)
    })
    // Ainda nada: o termo só vira query depois da janela inteira.
    expect(fetchPage).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchPage).toHaveBeenCalledTimes(3)
    // Termo aparado, e a página VOLTOU a 1 — a página 3 do termo antigo não é
    // a página 3 do termo novo.
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, q: 'ana' })
    expect(result.current.first).toBe(0)
    expect(result.current.filter).toBe('ana ')
    expect(result.current.term).toBe('ana')
  })

  it('trocar um filtro nomeado volta à página 1 e manda só os filtros preenchidos', async () => {
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result, rerender } = renderHook(
      ({ status }: { status: string | null }) => useServerTable(fetchPage, { key: ['x'], filters: { status } }),
      { wrapper: Wrapper, initialProps: { status: null as string | null } },
    )
    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    act(() => result.current.onPage({ first: 20 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, per_page: 10 }))

    rerender({ status: 'habilitada' })

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, status: 'habilitada' }))
    expect(result.current.first).toBe(0)
  })

  it('trocar a `key` (a FONTE da lista) volta à página 1 — sem pedir a página velha do endpoint novo', async () => {
    // Ativas ↔ Arquivadas: o `useTurmasPage` troca endpoint E chave. Estando na
    // página 3, o escopo antigo (só termo + filtros) não via diferença nenhuma
    // e a primeira query da lista nova saía com `page: 3`.
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result, rerender } = renderHook(
      ({ key }: { key: readonly unknown[] }) => useServerTable(fetchPage, { key }),
      { wrapper: Wrapper, initialProps: { key: ['turmas', 'list'] as readonly unknown[] } },
    )
    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    act(() => result.current.onPage({ first: 20 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, per_page: 10 }))

    rerender({ key: ['turmas', 'archived'] as readonly unknown[] })

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10 }))
    expect(result.current.first).toBe(0)
  })

  it('onSort manda `campo`/`-campo`, volta à página 1, e ordem zero tira o sort', async () => {
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    act(() => result.current.onPage({ first: 20 }))

    act(() => result.current.onSort({ sortField: 'name', sortOrder: -1 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, sort: '-name' }))
    expect(result.current.sortField).toBe('name')
    expect(result.current.sortOrder).toBe(-1)

    act(() => result.current.onSort({ sortField: 'name', sortOrder: 1 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, sort: 'name' }))

    // `removableSort`: o terceiro clique devolve 0 — sem sort, o servidor
    // volta ao DEFAULT_SORT dele.
    act(() => result.current.onSort({ sortField: 'name', sortOrder: 0 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10 }))
  })
})

describe('useServerTable — filtering mede EFEITO, não presença', () => {
  it('filtro presente que não corta linha não é "filtrando"; o que corta é', async () => {
    const semCorte = vi.fn(() => Promise.resolve(pagina(linhas, { total: 2, total_unfiltered: 2 })))
    const a = comCliente()
    const naoCorta = renderHook(() => useServerTable(semCorte, { key: ['a'], filters: { status: 'x' } }), { wrapper: a.Wrapper })
    await waitFor(() => expect(naoCorta.result.current.meta).toBeDefined())
    expect(naoCorta.result.current.filteredByScope).toBe(false)
    expect(naoCorta.result.current.filtering).toBe(false)

    const comCorte = vi.fn(() => Promise.resolve(pagina([linhas[0]], { total: 1, total_unfiltered: 2 })))
    const b = comCliente()
    const corta = renderHook(() => useServerTable(comCorte, { key: ['b'], filters: { status: 'x' } }), { wrapper: b.Wrapper })
    await waitFor(() => expect(corta.result.current.meta).toBeDefined())
    expect(corta.result.current.filteredByScope).toBe(true)
    expect(corta.result.current.filtering).toBe(true)
  })

  it('busca conta em filtering mas não em filteredByScope', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn(() => Promise.resolve(pagina([linhas[0]], { total: 1, total_unfiltered: 2 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })

    act(() => result.current.onFilterChange('ana'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS)
    })

    expect(result.current.filtering).toBe(true)
    expect(result.current.filteredByScope).toBe(false)
  })

  it('clear() zera termo e página', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    act(() => result.current.onFilterChange('ana'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS)
    })
    act(() => result.current.onPage({ first: 10 }))

    act(() => result.current.clear())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS)
    })

    expect(result.current.filter).toBe('')
    expect(result.current.term).toBe('')
    expect(result.current.first).toBe(0)
  })

  it('clampa first quando a página pedida some (total encolheu)', async () => {
    let total = 30
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total, last_page: Math.ceil(total / 10), total_unfiltered: total })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.meta).toBeDefined())

    total = 5
    act(() => result.current.onPage({ first: 20 }))

    await waitFor(() => expect(result.current.first).toBe(0))
  })

  it('falha sem corpo sobe `{}`, e refetch devolve a promise (Q-14)', async () => {
    const fetchPage = vi.fn(() => Promise.reject(undefined))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toEqual({})
    expect(result.current.rows).toEqual([])
    expect(result.current.refetch()).toBeInstanceOf(Promise)
  })
})
