import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useLoadState } from './useLoadState'

type Item = { id: number }

/** Sentinela de identidade: `Promise.resolve()` passaria num `toBeDefined()`
 * frouxo, e o `void` que o D-54 removeu voltaria verde. */
const RESULTADO = { data: [{ id: 1 }] }

/** O hook não chama hook nenhum: é derivação pura sobre o resultado da query.
 * `renderHook` está aqui só para não violar `react-hooks/rules-of-hooks` — o
 * mesmo arranjo do `useResourceState.test.ts`. */
function query(
  over: Partial<Omit<UseQueryResult<Item[], ProblemDetails>, 'error'>> & {
    error?: ProblemDetails | null
  },
) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: () => Promise.resolve(RESULTADO),
    ...over,
  } as unknown as UseQueryResult<Item[], ProblemDetails>
}

const DO_SERVIDOR = { detail: 'Ocorreu um erro inesperado. Tente novamente.' } as ProblemDetails
const DO_FRONT = { detail: 'Revisa tu conexión.', localDetail: true } as ProblemDetails

describe('useLoadState — o detail que pode ir à tela', () => {
  it('detail do SERVIDOR não sai do hook', () => {
    const { result } = renderHook(() => useLoadState(query({ isError: true, error: DO_SERVIDOR })))

    expect(result.current.errorDetail).toBeUndefined()
    // `loadError` continua carregando o envelope INTEIRO: quem precisa do
    // objeto (o `AppDataTable`) segue recebendo, e a política é de quem imprime.
    expect(result.current.loadError).toBe(DO_SERVIDOR)
  })

  it('detail do FRONT sai, porque já é i18n', () => {
    const { result } = renderHook(() => useLoadState(query({ isError: true, error: DO_FRONT })))

    expect(result.current.errorDetail).toBe('Revisa tu conexión.')
  })

  it('a dica acompanha o STATUS, já que o detail não vai', () => {
    const proibido = { status: 403, detail: 'This action is unauthorized.' } as ProblemDetails

    const { result } = renderHook(() => useLoadState(query({ isError: true, error: proibido })))

    expect(result.current.errorDetail).toBeUndefined()
    expect(result.current.errorHint).toBe('common.forbiddenHint')
  })

  it('sem erro: undefined', () => {
    const { result } = renderHook(() => useLoadState(query({ isSuccess: true, data: [] })))

    expect(result.current.errorDetail).toBeUndefined()
  })
})

describe('useLoadState — o contrato Q-14', () => {
  it('DEVOLVE a promise do refetch, com o resultado da query', async () => {
    const { result } = renderHook(() => useLoadState(query({ isSuccess: true, data: [] })))

    await expect(result.current.refetch()).resolves.toBe(RESULTADO)
  })
})
