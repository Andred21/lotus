import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '@shared/api/axios'
import { useServerTable } from '@shared/hooks'
import { certificatesPage, certificatesTableOptions } from './certificatesApi'

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

describe('a página do Historial — revalidação do estado derivado', () => {
  /**
   * `display_status` é derivado no servidor a partir do "hoje" de Santiago, e
   * congela no fetch. A aba do Historial fica aberta o dia inteiro: sem
   * revalidar, um certificado que venceu à meia-noite continua com a tag
   * `vigente` até alguém remontar a tela — estado errado sobre documento de
   * peso legal (Q-1 do review de 2026-08-24). Com a lista paginada, a opção
   * viaja em `certificatesTableOptions` e é o `useServerTable` que a entrega
   * ao `useQuery` — é isso que se prova aqui.
   */
  it('revalida quando a janela volta ao foco, contra o default do AppProviders', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { page: 1, per_page: 10, total: 0, last_page: 1, total_unfiltered: 0, summary: { vigente: 0, por_vencer: 0, vencido: 0, revocado: 0 } } } })

    const { result } = renderHook(() => useServerTable(certificatesPage, certificatesTableOptions), { wrapper })

    await waitFor(() => expect(result.current.meta).toBeDefined())
    expect(get).toHaveBeenCalledTimes(1)

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    focusManager.setFocused(undefined)
  })
})
