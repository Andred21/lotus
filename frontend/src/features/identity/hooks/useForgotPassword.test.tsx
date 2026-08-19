import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForgotPassword } from './useForgotPassword'
import { api } from '@shared/api/axios'

vi.mock('@shared/api/axios', async () => ({
  ...(await vi.importActual<typeof import('@shared/api/axios')>('@shared/api/axios')),
  api: { post: vi.fn(), get: vi.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useForgotPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pede a recuperação na rota pública e marca sent no sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null } as never)

    const { result } = renderHook(() => useForgotPassword(), { wrapper })
    act(() => result.current.setEmail('ana@lotus.cl'))
    act(() => result.current.submit())

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/password/forgot', { email: 'ana@lotus.cl' }))
    await waitFor(() => expect(result.current.sent).toBe(true))
  })
})
