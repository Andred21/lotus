import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ProblemDetails } from '@shared/api/axios'
import { useWindowedQuery } from './useWindowedQuery'

type Payload = { id: number }

/** Sentinela de identidade: `Promise.resolve()` passaria num `toBeDefined()`
 * frouxo, e o `void` que o `useResourceState` já removeu voltaria verde. */
const RESULTADO = { ok: true }

type Q = {
  data?: Payload
  isError: boolean
  error: ProblemDetails | null
  refetch: () => Promise<unknown>
}

function query(over: Partial<Q> = {}): Q {
  return { data: undefined, isError: false, error: null, refetch: () => Promise.resolve(RESULTADO), ...over }
}

const A: Payload = { id: 1 }
const B: Payload = { id: 2 }
const TRANSPORTE = { detail: 'Revisa tu conexión.', localDetail: true } as ProblemDetails
const JANELA_INVERTIDA = { status: 422, detail: 'La fecha de término no puede ser anterior a la de inicio.' } as ProblemDetails
const PROIBIDO = { status: 403, detail: 'This action is unauthorized.' } as ProblemDetails

describe('useWindowedQuery — o piso', () => {
  it('sem dado em nenhuma janela: data undefined', () => {
    const { result } = renderHook(() => useWindowedQuery(query()))

    expect(result.current.data).toBeUndefined()
  })

  it('devolve o dado da janela atual', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ data: A })))

    expect(result.current.data).toBe(A)
  })

  it('mantém o último payload enquanto a janela nova carrega (key nova, data undefined)', () => {
    const { result, rerender } = renderHook(({ q }) => useWindowedQuery(q), { initialProps: { q: query({ data: A }) } })

    rerender({ q: query() })

    expect(result.current.data).toBe(A)
  })

  it('o dado novo vence o piso no MESMO render em que chega', () => {
    const { result, rerender } = renderHook(({ q }) => useWindowedQuery(q), { initialProps: { q: query({ data: A }) } })

    rerender({ q: query({ data: B }) })

    expect(result.current.data).toBe(B)
  })

  it('o piso é o último payload bom, de qualquer janela', () => {
    const { result, rerender } = renderHook(({ q }) => useWindowedQuery(q), { initialProps: { q: query({ data: A }) } })

    rerender({ q: query({ data: B }) })
    rerender({ q: query() })

    expect(result.current.data).toBe(B)
  })
})

describe('useWindowedQuery — a falha antiga (stale)', () => {
  it('sem falha: nada a avisar', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ data: A })))

    expect(result.current.staleFailed).toBe(false)
    expect(result.current.staleError).toBeNull()
    expect(result.current.staleRetry).toBeUndefined()
  })

  it('falha sem nada em mão NÃO é stale: a tela é de quem lê `data`', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ isError: true, error: TRANSPORTE })))

    expect(result.current.data).toBeUndefined()
    expect(result.current.staleFailed).toBe(false)
    expect(result.current.staleError).toBeNull()
    expect(result.current.staleRetry).toBeUndefined()
  })

  it('falha COM dado em cache da própria janela: stale, e o detail do FRONT sai', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ data: A, isError: true, error: TRANSPORTE })))

    expect(result.current.staleFailed).toBe(true)
    expect(result.current.staleError).toBe('Revisa tu conexión.')
  })

  it('falha da janela nova com o piso em mão: stale sobre o payload antigo', () => {
    const { result, rerender } = renderHook(({ q }) => useWindowedQuery(q), { initialProps: { q: query({ data: A }) } })

    rerender({ q: query({ isError: true, error: JANELA_INVERTIDA }) })

    expect(result.current.data).toBe(A)
    expect(result.current.staleFailed).toBe(true)
  })

  it('detail de SERVIDOR fora da allowlist não sai: staleError null e a dica acompanha o STATUS', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ data: A, isError: true, error: JANELA_INVERTIDA })))

    expect(result.current.staleError).toBeNull()
    expect(result.current.staleHint).toBe('common.invalidDataHint')
  })

  it('403: o detail do servidor vai, e a dica é a de permissão', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ data: A, isError: true, error: PROIBIDO })))

    expect(result.current.staleError).toBe('This action is unauthorized.')
    expect(result.current.staleHint).toBe('common.forbiddenHint')
  })

  it('sem erro, a dica é a genérica', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ data: A })))

    expect(result.current.staleHint).toBe('common.loadErrorHint')
  })
})

describe('useWindowedQuery — repetir só recupera falha de transporte', () => {
  const repetivel = (error: ProblemDetails) =>
    renderHook(() => useWindowedQuery(query({ data: A, isError: true, error }))).result.current.staleRetry

  it('sem status (o `{}` do interceptor): oferece', () => {
    expect(repetivel({} as ProblemDetails)).toBeDefined()
  })

  it('erro sem corpo (null) com isError: oferece', () => {
    const { result } = renderHook(() => useWindowedQuery(query({ data: A, isError: true, error: null })))

    expect(result.current.staleRetry).toBeDefined()
  })

  it('5xx: oferece', () => {
    expect(repetivel({ status: 503 } as ProblemDetails)).toBeDefined()
  })

  it('4xx é a recusa desta janela: não oferece', () => {
    for (const status of [400, 403, 404, 422, 429]) {
      expect(repetivel({ status } as ProblemDetails)).toBeUndefined()
    }
  })

  it('o retry DEVOLVE a promise do refetch', async () => {
    const retry = repetivel(TRANSPORTE)

    expect(await retry?.()).toBe(RESULTADO)
  })
})
