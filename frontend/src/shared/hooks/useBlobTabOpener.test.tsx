import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
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

function montar(fetchBlob: (id: number) => Promise<Blob>, strict = false) {
  return renderHook(
    () => {
      // `ProblemDetails`, e não uma forma qualquer: `useBlobTabOpener` exige
      // `UseMutationResult<Blob, ProblemDetails, TVariables>`, e um erro de
      // outro tipo reprova no `tsc -b` antes de o teste rodar.
      const mutation = useMutation<Blob, ProblemDetails, number>({ mutationFn: fetchBlob })
      return useBlobTabOpener(mutation)
    },
    { wrapper, reactStrictMode: strict },
  )
}

type MutateCallback = {
  onSuccess?: (blob: Blob) => void
  onError?: () => void
}

/**
 * Dubla de `mutation` que NÃO passa pelo `MutationObserver` real do
 * TanStack Query — guarda o callback por chamada e devolve o controle de
 * quando ele dispara para o teste.
 *
 * Verificado na íntegra (`Mutation.#dispatch` e `MutationObserver.#notify`
 * do `@tanstack/react-query@5.101.1`): o observer real só entrega o
 * callback de uma chamada de `mutate()` se (a) o componente ainda estiver
 * inscrito (`hasListeners()`) e (b) nenhuma chamada de `mutate()` mais
 * recente tiver rodado no meio (`removeObserver` desliga a chamada antiga
 * antes dela resolver) — as duas travas do próprio TanStack fecham
 * exatamente as duas janelas de corrida que os achados descrevem, o que
 * torna as duas impossíveis de reproduzir com `useMutation()` de verdade
 * (confirmado empiricamente: nenhum teste com mutation real ficou RED).
 * A dubla testa o CONTRATO do hook (`UseMutationResult`), não o
 * comportamento interno de uma versão específica da lib — é o comporta-
 * mento correto mesmo se o chamador não for o TanStack, ou se uma versão
 * futura da lib deixar de oferecer essa proteção.
 */
function montarComMutationDouble() {
  const callbacks: MutateCallback[] = []
  const mutate = vi.fn((_: number, options: MutateCallback | undefined) => {
    callbacks.push(options ?? {})
  })
  const mutation = {
    mutate,
    error: null,
    isPending: false,
  } as unknown as UseMutationResult<Blob, ProblemDetails, number>

  const { result, unmount } = renderHook(() => useBlobTabOpener(mutation))
  return { result, unmount, callbacks }
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

  /** Em desenvolvimento o app roda sob `React.StrictMode` (`src/main.tsx`),
   * que monta, desmonta e remonta o efeito de propósito. A trava de unmount
   * não pode ficar armada depois dessa remontagem — se ficar, o `onSuccess`
   * enxerga o componente como desmontado e a aba fica em `about:blank`. */
  it('aponta a aba para o objectURL mesmo sob StrictMode (efeito remontado)', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    vi.stubGlobal('open', vi.fn(() => tab))

    const { result } = montar(async () => new Blob(['%PDF']), true)
    act(() => result.current.open(7))

    await waitFor(() => expect(tab.location.href).toBe('blob:fake-url'))
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

  /** O callback por chamada pode disparar DEPOIS do unmount (é o contrato de
   * `mutate(variables, { onSuccess })`, não uma garantia do TanStack). Nesse
   * caso não há aba nem estado para apontar: o cleanup já fechou a aba, e
   * criar um objectURL novo só vazaria (nunca seria revogado). */
  it('não cria objectURL quando o onSuccess dispara depois do unmount', () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    vi.stubGlobal('open', vi.fn(() => tab))

    const { result, unmount, callbacks } = montarComMutationDouble()
    act(() => result.current.open(7))

    unmount()
    expect(tab.close).toHaveBeenCalled()

    callbacks[0].onSuccess?.(new Blob(['%PDF']))

    expect(criar).not.toHaveBeenCalled()
  })

  /** Um segundo `open()` antes de a primeira mutation assentar não pode
   * perder a referência da segunda aba: quando a primeira resolve, seu
   * `onSuccess` só pode zerar `tabRef` se ainda apontar para a PRÓPRIA aba. */
  it('não perde a referência da segunda aba quando o onSuccess da primeira dispara depois', () => {
    const tab1 = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    const tab2 = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    const openMock = vi.fn().mockReturnValueOnce(tab1).mockReturnValueOnce(tab2)
    vi.stubGlobal('open', openMock)

    const { result, unmount, callbacks } = montarComMutationDouble()
    act(() => result.current.open(7))
    act(() => result.current.open(8))

    // A primeira mutation resolve DEPOIS do segundo open sobrepor tabRef.
    callbacks[0].onSuccess?.(new Blob(['%PDF']))

    unmount()

    expect(tab2.close).toHaveBeenCalled()
  })
})
