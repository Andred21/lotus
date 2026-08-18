import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useResourceState } from './useResourceState'

type Perfil = { id: number }

/** O hook não chama hook nenhum: é derivação pura sobre o resultado da query,
 * como o `useLoadState`. O literal basta — `renderHook` está aqui só para não
 * violar `react-hooks/rules-of-hooks` no arquivo de teste.
 *
 * `error` sai do `Partial<UseQueryResult<…>>` e ganha tipo próprio: o union
 * discriminado de `QueryObserverResult` faz `Partial<…>['error']` colapsar
 * para `ProblemDetails | undefined`, sem `null` — `tsc` reprova `error: null`
 * mesmo sendo o formato real que o hook testado recebe (medido, não previsto
 * no plano). */
function query(
  over: Partial<Omit<UseQueryResult<Perfil, ProblemDetails>, 'error'>> & {
    error?: ProblemDetails | null
  },
) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: () => Promise.resolve(),
    ...over,
  } as unknown as UseQueryResult<Perfil, ProblemDetails>
}

// Marcado como envelope do FRONT de propósito: os casos abaixo medem que a
// falha CHEGA à tela, e depois da D-05 só o `detail` de autoria do front chega.
// Relaxar a asserção esconderia o que o caso guarda.
const BOOM = { detail: 'boom', localDetail: true } as ProblemDetails

describe('useResourceState', () => {
  it('falhou sem nada em cache: autoriza substituir a tela', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ isError: true, error: BOOM })),
    )

    expect(result.current.failedWithoutData).toBe(true)
    expect(result.current.errorDetail).toBe('boom')
    expect(result.current.loadError).toBe(BOOM)
  })

  it('falhou COM cache: a falha avisa ao lado, não substitui', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ data: { id: 1 }, isError: true, error: BOOM })),
    )

    expect(result.current.failedWithoutData).toBe(false)
    expect(result.current.loadError).toBe(BOOM)
    expect(result.current.data).toEqual({ id: 1 })
  })

  it('isError sem corpo ainda é falha', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ isError: true, error: null })),
    )

    expect(result.current.loadError).toEqual({})
    expect(result.current.failedWithoutData).toBe(true)
  })

  it('detail do SERVIDOR não sai do hook, mas o envelope continua em loadError', () => {
    const DO_SERVIDOR = { detail: 'Erro interno' } as ProblemDetails

    const { result } = renderHook(() =>
      useResourceState(query({ isError: true, error: DO_SERVIDOR })),
    )

    expect(result.current.errorDetail).toBeUndefined()
    expect(result.current.loadError).toBe(DO_SERVIDOR)
  })

  it('detail do FRONT sai, porque já é i18n', () => {
    const DO_FRONT = { detail: 'Revisa tu conexión.', localDetail: true } as ProblemDetails

    const { result } = renderHook(() => useResourceState(query({ isError: true, error: DO_FRONT })))

    expect(result.current.errorDetail).toBe('Revisa tu conexión.')
  })

  it('a dica acompanha o STATUS, já que o detail não vai', () => {
    const NAO_ENCONTRADO = { status: 404, detail: 'No query results for model [Turma] 5' } as ProblemDetails

    const { result } = renderHook(() => useResourceState(query({ isError: true, error: NAO_ENCONTRADO })))

    expect(result.current.errorDetail).toBeUndefined()
    expect(result.current.errorHint).toBe('common.notFoundHint')
  })

  it('sucesso não deixa resíduo de erro', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ data: { id: 1 }, isSuccess: true })),
    )

    expect(result.current.loadError).toBeNull()
    expect(result.current.failedWithoutData).toBe(false)
    expect(result.current.errorDetail).toBeUndefined()
  })
})
