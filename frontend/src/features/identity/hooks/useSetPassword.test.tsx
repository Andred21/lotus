import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useSetPassword } from './useSetPassword'
import { api } from '@shared/api/axios'

vi.mock('@shared/api/axios', async () => ({
  ...(await vi.importActual<typeof import('@shared/api/axios')>('@shared/api/axios')),
  api: { post: vi.fn(), get: vi.fn() },
}))

const { wrapper } = createWrapper()

describe('useSetPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('manda o convite para /api/invitation/accept e a recuperação para /api/password/reset', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null } as never)

    const convite = renderHook(() => useSetPassword('tok', 'invite', 'ana@lotus.cl'), { wrapper })
    act(() => convite.result.current.submit())
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/invitation/accept', expect.anything()))

    const reset = renderHook(() => useSetPassword('tok', 'reset', 'ana@lotus.cl'), { wrapper })
    act(() => reset.result.current.submit())
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/password/reset', expect.anything()))
  })

  it('marca tokenRejected quando o 422 nomeia o token', async () => {
    vi.mocked(api.post).mockRejectedValue({ status: 422, errors: { token: ['inválido'] } })

    const { result } = renderHook(() => useSetPassword('tok', 'invite', 'ana@lotus.cl'), { wrapper })
    act(() => result.current.submit())

    // É este ramo que manda o usuário para "olvidé mi clave" em vez de deixá-lo
    // preso numa tela que nunca vai funcionar.
    await waitFor(() => expect(result.current.tokenRejected).toBe(true))
  })

  it('expõe generalError quando a falha não nomeia campo (429 do throttle, 419 de CSRF, 500)', async () => {
    vi.mocked(api.post).mockRejectedValue({
      status: 429,
      detail: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
    })

    const { result } = renderHook(() => useSetPassword('tok', 'reset', 'ana@lotus.cl'), { wrapper })
    act(() => result.current.submit())

    // Sem isto o botão para de girar e a tela não diz nada: a rota é
    // throttle:6,1, então quem erra a confirmação seis vezes chega aqui.
    await waitFor(() =>
      expect(result.current.generalError).toBe('Demasiadas solicitudes. Inténtalo de nuevo más tarde.'),
    )
    expect(result.current.tokenRejected).toBe(false)
  })
})
