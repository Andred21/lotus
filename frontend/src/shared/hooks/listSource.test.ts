import { describe, expect, it } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { listSource, loadFailure } from './listSource'

type Item = { id: number }

/** O sentinela existe para provar IDENTIDADE: um `refetch` que devolvesse
 * `Promise.resolve()` passaria num `resolves.toBeDefined()` frouxo e a regressão
 * do Q-14 voltaria verde. */
const RESULTADO = { data: [{ id: 1 }] }

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

describe('loadFailure — a política "falhou" vs. "veio vazia"', () => {
  it('devolve null em sucesso, INCLUSIVE com lista vazia', () => {
    expect(loadFailure(query({ isSuccess: true, data: [] }))).toBeNull()
  })

  it('devolve o envelope quando a query falhou', () => {
    const problema = { detail: 'Sin conexión', localDetail: true } as ProblemDetails

    expect(loadFailure(query({ isError: true, error: problema }))).toBe(problema)
  })

  it('devolve {} quando isError sem corpo — falha que null esconderia', () => {
    expect(loadFailure(query({ isError: true, error: null }))).toEqual({})
  })
})

describe('listSource — a forma normalizada de lista', () => {
  it('items é [] quando não há dado, e a falha vem de loadFailure', () => {
    const source = listSource(query({ isError: true, error: null, isLoading: false }))

    expect(source.items).toEqual([])
    expect(source.error).toEqual({})
    expect(source.loading).toBe(false)
  })

  it('DEVOLVE a promise do refetch (contrato Q-14)', async () => {
    const source = listSource(query({ isSuccess: true, data: [{ id: 1 }] }))

    await expect(source.refetch()).resolves.toBe(RESULTADO)
  })
})
