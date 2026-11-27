import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { api } from '@shared/api/axios'
import { createWrapper } from '@shared/testing/providers'
import { useHistorial } from './useHistorial'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

// Só as permissões: o `useServerTable` aqui é o REAL, porque o que se prova é
// o que vai na query string e a volta à página 1 — comportamento do conjunto.
vi.mock('@shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/hooks')>()),
  usePermissions: () => ({ can: () => true, hasRole: () => true, roles: [] }),
}))

const get = vi.mocked(api.get)

const pagina = {
  data: [],
  meta: { total: 30, total_unfiltered: 30, summary: { vigente: 0, por_vencer: 0, vencido: 0, revocado: 0 } },
}

const paginasPedidas = () =>
  get.mock.calls
    .filter(([url]) => url === '/api/certificates')
    .map(([, config]) => (config?.params ?? {}) as Record<string, unknown>)

describe('useHistorial — filtro de cotação', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation((url) =>
      Promise.resolve({
        data: url === '/api/certificates/quotes' ? [{ id: 7, code: 'Scap 4 - R2' }] : pagina,
      }),
    )
  })

  it('escolher a cotação manda quote_id e volta à página 1', async () => {
    const { wrapper } = createWrapper({ route: '/historial' })
    const { result } = renderHook(() => useHistorial(), { wrapper })
    await waitFor(() => expect(paginasPedidas()).toHaveLength(1))

    act(() => result.current.table.onPage({ first: 10 }))
    await waitFor(() => expect(paginasPedidas().at(-1)).toMatchObject({ page: 2 }))

    act(() => result.current.setQuoteFilter(7))

    await waitFor(() => expect(paginasPedidas().at(-1)).toMatchObject({ page: 1, quote_id: 7 }))
    expect(result.current.quoteFilter).toBe(7)
  })

  it('lista as opções vindas de /api/certificates/quotes', async () => {
    const { wrapper } = createWrapper({ route: '/historial' })
    const { result } = renderHook(() => useHistorial(), { wrapper })

    await waitFor(() => expect(result.current.quoteOptions).toEqual([{ id: 7, code: 'Scap 4 - R2' }]))
  })

  it('clearFilters zera o estado E a cotação, e a query sai sem os dois', async () => {
    const { wrapper } = createWrapper({ route: '/historial' })
    const { result } = renderHook(() => useHistorial(), { wrapper })
    // Um por vez, como o usuário: duas escritas no mesmo tick não se compõem.
    act(() => result.current.setStatusFilter('vigente'))
    act(() => result.current.setQuoteFilter(7))
    await waitFor(() => expect(paginasPedidas().at(-1)).toMatchObject({ display_status: 'vigente', quote_id: 7 }))

    act(() => result.current.clearFilters())

    expect(result.current.statusFilter).toBeNull()
    expect(result.current.quoteFilter).toBeNull()
    await waitFor(() => {
      const ultima = paginasPedidas().at(-1)
      expect(ultima).not.toHaveProperty('display_status')
      expect(ultima).not.toHaveProperty('quote_id')
    })
  })

  it('estado, cotação, busca, página e sort vêm da URL, e o primeiro GET já sai com eles', async () => {
    const { wrapper } = createWrapper({
      route: '/historial?display_status=vencido&quote_id=7&q=scap&page=2&sort=-valido_ate',
    })
    const { result } = renderHook(() => useHistorial(), { wrapper })

    await waitFor(() => expect(paginasPedidas()).toHaveLength(1))
    expect(paginasPedidas()[0]).toMatchObject({
      display_status: 'vencido', quote_id: 7, q: 'scap', page: 2, sort: '-valido_ate',
    })
    expect(result.current.statusFilter).toBe('vencido')
    expect(result.current.quoteFilter).toBe(7)
  })

  it('valor de filtro inválido na URL é "sem filtro", e sort fora das colunas é ignorado', async () => {
    const { wrapper } = createWrapper({
      route: '/historial?display_status=qualquer&quote_id=7x&sort=nome',
    })
    const { result } = renderHook(() => useHistorial(), { wrapper })

    await waitFor(() => expect(paginasPedidas()).toHaveLength(1))
    expect(paginasPedidas()[0]).not.toHaveProperty('display_status')
    expect(paginasPedidas()[0]).not.toHaveProperty('quote_id')
    expect(paginasPedidas()[0]).not.toHaveProperty('sort')
    expect(result.current.statusFilter).toBeNull()
    expect(result.current.quoteFilter).toBeNull()
  })

  it('GET de cotações falho sem cache: expõe a falha e o retry, e a lista segue carregando', async () => {
    get.mockImplementation((url) =>
      url === '/api/certificates/quotes'
        ? Promise.reject({ status: 500, title: 'x', detail: 'x', type: 'x', instance: 'x' })
        : Promise.resolve({ data: pagina }),
    )
    const { wrapper } = createWrapper({ route: '/historial' })
    const { result } = renderHook(() => useHistorial(), { wrapper })

    await waitFor(() => expect(result.current.quoteLoadFailure).toBeTruthy())
    expect(result.current.quoteOptions).toEqual([])
    expect(result.current.loadError).toBeNull()
    expect(typeof result.current.reloadQuotes).toBe('function')
  })

  it('cotações carregadas: não há falha a anunciar', async () => {
    const { wrapper } = createWrapper({ route: '/historial' })
    const { result } = renderHook(() => useHistorial(), { wrapper })

    await waitFor(() => expect(result.current.quoteOptions).toHaveLength(1))
    expect(result.current.quoteLoadFailure).toBeNull()
  })
})
