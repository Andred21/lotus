import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProblemDetails } from '@shared/api/axios'
import { useBlobTabOpener } from './useBlobTabOpener'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const criar = vi.fn(() => 'blob:fake-url')
const revogar = vi.fn()

beforeEach(() => {
  criar.mockClear()
  revogar.mockClear()
  URL.createObjectURL = criar as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = revogar as unknown as typeof URL.revokeObjectURL
})

afterEach(() => {
  vi.restoreAllMocks()
})

function montar(fetchBlob: (id: number) => Promise<Blob>) {
  return renderHook(
    () => {
      // `ProblemDetails`, e não uma forma qualquer: `useBlobTabOpener` exige
      // `UseMutationResult<Blob, ProblemDetails, TVariables>`, e um erro de
      // outro tipo reprova no `tsc -b` antes de o teste rodar.
      const mutation = useMutation<Blob, ProblemDetails, number>({ mutationFn: fetchBlob })
      return useBlobTabOpener(mutation)
    },
    { wrapper },
  )
}

describe('useBlobTabOpener', () => {
  /** A aba abre ANTES da requisição de propósito: `window.open` fora do gesto
   * do usuário é bloqueado pelo navegador. */
  it('abre a aba antes de pedir o blob e aponta a aba para o objectURL', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    const open = vi.fn(() => tab)
    vi.stubGlobal('open', open)

    const { result } = montar(async () => new Blob(['%PDF']))
    act(() => result.current.open(7))

    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    await waitFor(() => expect(tab.location.href).toBe('blob:fake-url'))
    expect(tab.opener).toBeNull()
  })

  /** Popup bloqueado avisa, em vez de o botão só parar de carregar. */
  it('sinaliza popup bloqueado e não dispara a requisição', async () => {
    vi.stubGlobal('open', vi.fn(() => null))
    const fetchBlob = vi.fn(async () => new Blob(['%PDF']))

    const { result } = montar(fetchBlob)
    act(() => result.current.open(7))

    await waitFor(() => expect(result.current.popupBlocked).toBe(true))
    expect(fetchBlob).not.toHaveBeenCalled()
  })

  it('fecha a aba quando a requisição falha', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    vi.stubGlobal('open', vi.fn(() => tab))

    const { result } = montar(async () => {
      throw {
        type: 'https://lotus.cl/errors/forbidden',
        title: 'Sem permissão',
        status: 403,
        detail: 'Sem permissão para ver este certificado.',
        instance: '/api/certificates/7/pdf',
      } satisfies ProblemDetails
    })
    act(() => result.current.open(7))

    await waitFor(() => expect(tab.close).toHaveBeenCalled())
    expect(result.current.message).not.toBeNull()
  })

  /** Um objectURL vivo por vez, e nenhum sobrevivendo ao unmount. */
  it('revoga o objectURL no unmount', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    vi.stubGlobal('open', vi.fn(() => tab))

    const { result, unmount } = montar(async () => new Blob(['%PDF']))
    act(() => result.current.open(7))
    await waitFor(() => expect(criar).toHaveBeenCalled())

    unmount()

    expect(revogar).toHaveBeenCalledWith('blob:fake-url')
  })
})
