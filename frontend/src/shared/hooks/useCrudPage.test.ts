import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCrudPage } from './useCrudPage'
import type { ProblemDetails } from '@shared/api/axios'

interface Item {
  id?: number
  name: string
}

/** `ListableResource` é estrutural: este literal basta, sem TanStack. */
function fakeResource(state: {
  data?: Item[]
  isLoading?: boolean
  isError?: boolean
  error?: ProblemDetails | null
}) {
  return {
    useList: () => ({
      data: state.data,
      isLoading: state.isLoading ?? false,
      isError: state.isError ?? false,
      error: state.error ?? null,
      // TanStack Query devolve uma Promise do refetch real (useQuery). O fake
      // espelha isso para o teste de forwarding poder distinguir "devolveu a
      // promise" de "descartou e devolveu undefined" (Q-14).
      refetch: () => Promise.resolve(),
    }),
  }
}

describe('useCrudPage', () => {
  it('deriva a entidade da lista viva, sem congelar o objeto', () => {
    // O dialog guarda o ID, não o objeto: invalidação de query (upload,
    // edição de nested) tem de chegar ao dialog aberto.
    const { result, rerender } = renderHook(({ items }) => useCrudPage(fakeResource({ data: items })), {
      initialProps: { items: [{ id: 1, name: 'antigo' }] as Item[] },
    })

    act(() => result.current.openView({ id: 1, name: 'antigo' }))
    expect(result.current.dialog?.entity?.name).toBe('antigo')

    rerender({ items: [{ id: 1, name: 'novo' }] })
    expect(result.current.dialog?.entity?.name).toBe('novo')
  })

  it('distingue lista vazia de GET falho (D16)', () => {
    const vazio = renderHook(() => useCrudPage(fakeResource({ data: [] })))
    expect(vazio.result.current.items).toEqual([])
    expect(vazio.result.current.error).toBeNull()

    const falho = renderHook(() =>
      useCrudPage(fakeResource({ isError: true, error: { detail: 'sem permissão' } as ProblemDetails })),
    )
    expect(falho.result.current.items).toEqual([])
    expect(falho.result.current.error?.detail).toBe('sem permissão')
  })

  it('erro de rede sem ProblemDetails ainda sobe truthy', () => {
    // O erro que não passa pelo interceptor: isError sem corpo. Se caísse em
    // null, a tela mostraria o empty state que convida a cadastrar sobre falha.
    const { result } = renderHook(() => useCrudPage(fakeResource({ isError: true, error: null })))

    expect(result.current.error).toBeTruthy()
  })

  it('openViewById abre sem entidade e a recebe quando a lista chega', () => {
    const { result, rerender } = renderHook(({ items }) => useCrudPage(fakeResource({ data: items })), {
      initialProps: { items: [] as Item[] },
    })

    act(() => result.current.openViewById(7))
    expect(result.current.dialog?.mode).toBe('view')
    expect(result.current.dialog?.entity).toBeNull()

    rerender({ items: [{ id: 7, name: 'chegou' }] })
    expect(result.current.dialog?.entity?.name).toBe('chegou')
  })

  it('startEdit não sai de create', () => {
    const { result } = renderHook(() => useCrudPage(fakeResource({ data: [{ id: 1, name: 'x' }] })))

    act(() => result.current.openCreate())
    act(() => result.current.startEdit())

    expect(result.current.dialog?.mode).toBe('create')
  })

  it('startEdit não entra em edit sem entidade, e entra quando ela chega', () => {
    // Deep link cujo GET ainda não voltou: o dialog está em view com id, mas
    // sem entidade. Guardar por `id != null` deixava entrar em edit com
    // `entity` nula — quem segurava era cada página, não o hook.
    const { result, rerender } = renderHook(({ items }) => useCrudPage(fakeResource({ data: items })), {
      initialProps: { items: [] as Item[] },
    })

    act(() => result.current.openViewById(7))
    act(() => result.current.startEdit())

    expect(result.current.dialog?.mode).toBe('view')

    rerender({ items: [{ id: 7, name: 'chegou' }] })
    act(() => result.current.startEdit())

    expect(result.current.dialog?.mode).toBe('edit')
    expect(result.current.dialog?.entity?.name).toBe('chegou')
  })

  it('refetch devolve a promise em vez de descartá-la', async () => {
    // O AppErrorState aguarda este retorno para manter o botão em `loading`.
    // Descartar a promise (`() => { void query.refetch() }`) deixa o Reintentar
    // sem feedback nenhum, que é o Q-14.
    const { result } = renderHook(() => useCrudPage(fakeResource({ data: [] })))

    const returned = result.current.refetch()

    expect(returned).toBeInstanceOf(Promise)
    await returned
  })
})
