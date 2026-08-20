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
