import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useForgotPassword } from './useForgotPassword'
import { api } from '@shared/api/axios'

vi.mock('@shared/api/axios', async () => ({
  ...(await vi.importActual<typeof import('@shared/api/axios')>('@shared/api/axios')),
  api: { post: vi.fn(), get: vi.fn() },
}))

const { wrapper } = createWrapper()

describe('useForgotPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pede a recuperação na rota pública e marca sent no sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null } as never)

    const { result } = renderHook(() => useForgotPassword('ana@lotus.cl'), { wrapper })
    act(() => result.current.submit())

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/password/forgot', { email: 'ana@lotus.cl' }))
    await waitFor(() => expect(result.current.sent).toBe(true))
  })

  it('expõe generalError quando o pedido falha (429/419/500 — falha de transporte, não desmente a resposta genérica)', async () => {
    vi.mocked(api.post).mockRejectedValue({
      status: 429,
      detail: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
    })

    const { result } = renderHook(() => useForgotPassword('ana@lotus.cl'), { wrapper })
    act(() => result.current.submit())

    await waitFor(() =>
      expect(result.current.generalError).toBe('Demasiadas solicitudes. Inténtalo de nuevo más tarde.'),
    )
  })
})
