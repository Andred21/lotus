import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '@shared/api/axios'
import { useCertificates } from './certificatesApi'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

/**
 * O wrapper repete o default do `AppProviders` de propósito
 * (`refetchOnWindowFocus: false`): sem ele, a query passaria neste teste pelo
 * default do TanStack e a catraca não provaria nada.
 */
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useCertificates — revalidação do estado derivado', () => {
  /**
   * `display_status` é derivado no servidor a partir do "hoje" de Santiago, e
   * congela no fetch. A aba do Historial fica aberta o dia inteiro: sem
   * revalidar, um certificado que venceu à meia-noite continua com a tag
   * `vigente` até alguém remontar a tela — estado errado sobre documento de
   * peso legal (Q-1 do review de 2026-08-24).
   */
  it('revalida quando a janela volta ao foco, contra o default do AppProviders', async () => {
    get.mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useCertificates(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledTimes(1)

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    focusManager.setFocused(undefined)
  })
})
