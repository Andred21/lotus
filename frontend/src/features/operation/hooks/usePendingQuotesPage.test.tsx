import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '@shared/api/axios'
import { usePendingQuotesPage } from './usePendingQuotesPage'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

/** Cliente estável por teste — mesmo molde do useTurmasPage.test.tsx: um cliente
 * novo a cada render orfanaria a rejeição da query e o vitest reprovaria com
 * `Unknown Error: undefined`. */
function comCliente() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )

  return { qc, Wrapper }
}

describe('usePendingQuotesPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('normaliza a fila de pendentes na MESMA forma que useTurmasPage', async () => {
    get.mockResolvedValue({ data: [{ quote_id: 3 }] })

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => usePendingQuotesPage(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([{ quote_id: 3 }])
    expect(result.current.error).toBeNull()
  })

  it('devolve o envelope da falha, e `{}` quando o interceptor nao populou o corpo', async () => {
    get.mockRejectedValue(undefined)

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => usePendingQuotesPage(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toEqual({})
  })

  it('DEVOLVE a promise do refetch', async () => {
    // A guarda do D4, replicada aqui: `useLoadState` faz `void query.refetch()` e a
    // engole (D-54). E a promise que mantem o Reintentar do AppErrorState em
    // `loading` (Q-14), e trocar por `() => void` compilaria sem quebrar nada acima.
    get.mockResolvedValue({ data: [] })

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => usePendingQuotesPage(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.refetch()).resolves.toBeDefined()
  })
})
