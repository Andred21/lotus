import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { createWrapper } from '@shared/testing/providers'
import type { Page, PageMeta } from '@shared/api/page'
import { SERVER_TABLE_DEBOUNCE_MS, useServerTable } from './useServerTable'

interface Row {
  id: number
  name: string
}

const meta = (over: Partial<PageMeta> = {}): PageMeta => ({
  page: 1, per_page: 10, total: 2, last_page: 1, total_unfiltered: 2, ...over,
})

const pagina = (rows: Row[], m: Partial<PageMeta> = {}): Page<Row> => ({ data: rows, meta: meta(m) })

const linhas: Row[] = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bruno' },
]

/* `vi.useRealTimers()` sem `cleanup()`: o desmonte é global desde 2026-09-02
 * (`src/test-setup.ts`, P-69) e o vitest roda `afterEach` em ordem INVERSA de
 * registro — este hook primeiro, o do setup depois.
 *
 * O comentário anterior afirmava que sem o `cleanup()` daqui o `setTimeout` do
 * debounce disparava depois da destruição do jsdom e matava a rodada com
 * `ReferenceError: window is not defined`. Medido em 2026-09-02, no vitest
 * 4.1.10: não reproduz — a suíte inteira passa sem `setupFiles` E sem este
 * `cleanup()`. Fica registrado para ninguém remedir. */
afterEach(() => {
  vi.useRealTimers()
})

describe('useServerTable — a query que sai', () => {
  it('monta page/per_page sem q, sort nem filtro vazio, e devolve as linhas do envelope', async () => {
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas)))
    const { wrapper } = createWrapper()

    const { result } = renderHook(
      () => useServerTable(fetchPage, { key: ['x'], filters: { status: null } }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, per_page: 10 })
    expect(result.current.totalRecords).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('onPage pede a página certa a partir de first', async () => {
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(2))

    act(() => result.current.onPage({ first: 20 }))

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, per_page: 10 }))
    expect(result.current.first).toBe(20)
  })

  it('digitar não busca a cada tecla: um GET depois do debounce, com q, na página 1', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper })

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
    const { wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ status }: { status: string | null }) => useServerTable(fetchPage, { key: ['x'], filters: { status } }),
      { wrapper, initialProps: { status: null as string | null } },
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
    const { wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ key }: { key: readonly unknown[] }) => useServerTable(fetchPage, { key }),
      { wrapper, initialProps: { key: ['turmas', 'list'] as readonly unknown[] } },
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
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper })
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
    const a = createWrapper()
    const naoCorta = renderHook(() => useServerTable(semCorte, { key: ['a'], filters: { status: 'x' } }), { wrapper: a.wrapper })
    await waitFor(() => expect(naoCorta.result.current.meta).toBeDefined())
    expect(naoCorta.result.current.filteredByScope).toBe(false)
    expect(naoCorta.result.current.filtering).toBe(false)

    const comCorte = vi.fn(() => Promise.resolve(pagina([linhas[0]], { total: 1, total_unfiltered: 2 })))
    const b = createWrapper()
    const corta = renderHook(() => useServerTable(comCorte, { key: ['b'], filters: { status: 'x' } }), { wrapper: b.wrapper })
    await waitFor(() => expect(corta.result.current.meta).toBeDefined())
    expect(corta.result.current.filteredByScope).toBe(true)
    expect(corta.result.current.filtering).toBe(true)
  })

  it('busca conta em filtering mas não em filteredByScope', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn(() => Promise.resolve(pagina([linhas[0]], { total: 1, total_unfiltered: 2 })))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper })

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
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper })
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
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper })
    await waitFor(() => expect(result.current.meta).toBeDefined())

    total = 5
    act(() => result.current.onPage({ first: 20 }))

    await waitFor(() => expect(result.current.first).toBe(0))
  })

  it('falha sem corpo sobe `{}`, e refetch devolve a promise (Q-14)', async () => {
    const fetchPage = vi.fn(() => Promise.reject(undefined))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toEqual({})
    expect(result.current.rows).toEqual([])
    expect(result.current.refetch?.()).toBeInstanceOf(Promise)
  })
})

/* Estado na URL (C-3). O hook roda dentro de um router de dados (`route`) e
 * `useLocation` devolve a URL REAL que ele escreveu. */
describe('useServerTable — estado na URL', () => {
  const trinta = () => vi.fn(() => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
  const comUrl = (fetchPage: ReturnType<typeof trinta>, route: string, url: Parameters<typeof useServerTable>[1]['url'] = { sortable: ['name'] }) =>
    renderHook(
      () => ({ table: useServerTable(fetchPage, { key: ['x'], url }), location: useLocation() }),
      { wrapper: createWrapper({ route }).wrapper },
    )
  const params = (search: string) => new URLSearchParams(search)

  it('busca, página e sort vão à URL e voltam dela', async () => {
    vi.useFakeTimers()
    const { result } = comUrl(trinta(), '/lista')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    act(() => result.current.table.onPage({ first: 20 }))
    expect(params(result.current.location.search).get('page')).toBe('3')

    act(() => result.current.table.onSort({ sortField: 'name', sortOrder: -1 }))
    // Sort novo volta à página 1: `page` sai da URL, que não guarda o default.
    expect(params(result.current.location.search).get('sort')).toBe('-name')
    expect(params(result.current.location.search).has('page')).toBe(false)

    act(() => result.current.table.onFilterChange('ana'))
    // Só o TERMO (depois do debounce) vai à URL, não cada tecla.
    expect(params(result.current.location.search).has('q')).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS)
    })
    expect(params(result.current.location.search).get('q')).toBe('ana')

    vi.useRealTimers()
    // E volta dela: um hook novo sobre a mesma URL restaura tudo e o PRIMEIRO
    // GET já sai com o estado restaurado.
    const fetchPage = trinta()
    const restaurado = comUrl(fetchPage, '/lista?q=ana&page=3&sort=-name')
    await waitFor(() => expect(restaurado.result.current.table.rows).toHaveLength(2))
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith({ page: 3, per_page: 10, q: 'ana', sort: '-name' })
    expect(restaurado.result.current.table.filter).toBe('ana')
    expect(restaurado.result.current.table.first).toBe(20)
    expect(restaurado.result.current.table.sortField).toBe('name')
    expect(restaurado.result.current.table.sortOrder).toBe(-1)
  })

  it('URL inválida cai nos defaults', async () => {
    const fetchPage = trinta()
    const { result } = comUrl(fetchPage, '/lista?page=-3&sort=xyz')
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))

    expect(result.current.table.first).toBe(0)
    expect(result.current.table.sortField).toBeUndefined()
    expect(result.current.table.sortOrder).toBe(0)
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, per_page: 10 })
  })

  it.each(['abc', '0', '2.5', ''])('página %j na URL vira a primeira', async (page) => {
    const fetchPage = trinta()
    const { result } = comUrl(fetchPage, `/lista?page=${page}`)
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))

    expect(result.current.table.first).toBe(0)
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, per_page: 10 })
  })

  it('sem colunas `sortable` declaradas, nenhum sort da URL vale', async () => {
    const fetchPage = trinta()
    const { result } = comUrl(fetchPage, '/lista?sort=name', {})
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))

    expect(result.current.table.sortField).toBeUndefined()
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, per_page: 10 })
  })

  it('tab sobrevive à escrita da lista', async () => {
    const { result } = comUrl(trinta(), '/personas?tab=alumnos')
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))

    act(() => result.current.table.onPage({ first: 10 }))

    expect(params(result.current.location.search).get('tab')).toBe('alumnos')
    expect(params(result.current.location.search).get('page')).toBe('2')
  })

  it('prefixo isola duas tabelas: cada uma lê e escreve só as chaves dela', async () => {
    const { result } = comUrl(trinta(), '/lista?c_page=3&b_page=2', { prefix: 'b' })
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))
    expect(result.current.table.first).toBe(10)

    act(() => result.current.table.onPage({ first: 20 }))

    const p = params(result.current.location.search)
    expect(p.get('b_page')).toBe('3')
    expect(p.get('c_page')).toBe('3')
  })

  it('desligado (o default) não lê nem escreve', async () => {
    const fetchPage = trinta()
    const { result } = comUrl(fetchPage, '/lista?q=ana&page=3&sort=name', false)
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, per_page: 10 })
    expect(result.current.table.filter).toBe('')

    act(() => result.current.table.onPage({ first: 10 }))

    expect(result.current.location.search).toBe('?q=ana&page=3&sort=name')
  })

  it('trocar o filtro nomeado (escopo) tira a página da URL', async () => {
    const fetchPage = trinta()
    const { result, rerender } = renderHook(
      ({ status }: { status: string | null }) => ({
        table: useServerTable(fetchPage, { key: ['x'], filters: { status }, url: {} }),
        location: useLocation(),
      }),
      { wrapper: createWrapper({ route: '/lista?page=3' }).wrapper, initialProps: { status: null as string | null } },
    )
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))
    expect(result.current.table.first).toBe(20)

    rerender({ status: 'habilitada' })

    await waitFor(() => expect(params(result.current.location.search).has('page')).toBe(false))
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, status: 'habilitada' })
  })

  it('clear() limpa busca e página da URL', async () => {
    const { result } = comUrl(trinta(), '/lista?q=ana&page=2&tab=x')
    await waitFor(() => expect(result.current.table.rows).toHaveLength(2))

    act(() => result.current.table.clear())

    await waitFor(() => expect(params(result.current.location.search).has('q')).toBe(false))
    expect(params(result.current.location.search).has('page')).toBe(false)
    expect(params(result.current.location.search).get('tab')).toBe('x')
  })
})
