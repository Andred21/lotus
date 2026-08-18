import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useArchivedPage } from './useArchivedPage'
import type { ProblemDetails } from '@shared/api/axios'

interface Item {
  id?: number
  name: string
}
interface Archived {
  client: Item
  archived_at: string
  archived_by: string | null
}

/** Estrutural, como `useCrudPage.test.ts`: sem TanStack no teste. */
function fakeResource(state: {
  data?: Archived[]
  isLoading?: boolean
  isError?: boolean
  error?: ProblemDetails | null
  onEnabled?: (enabled: boolean) => void
  onRestore?: (id: number) => void
}) {
  return {
    useArchivedList: (enabled: boolean) => {
      state.onEnabled?.(enabled)
      return {
        data: state.data,
        isLoading: state.isLoading ?? false,
        isError: state.isError ?? false,
        error: state.error ?? null,
        refetch: () => Promise.resolve(),
      }
    },
    useRestore: () => ({
      mutate: (id: number) => state.onRestore?.(id),
      isPending: false,
    }),
  }
}

describe('useArchivedPage', () => {
  it('não busca em modo active e busca ao trocar para archived (D10)', () => {
    // A lição da D-04: buscar as duas visões na montagem dobra a rede sem ganho.
    const enabled: boolean[] = []
    const { result } = renderHook(() =>
      useArchivedPage(fakeResource({ data: [], onEnabled: (e) => enabled.push(e) })),
    )

    expect(result.current.mode).toBe('active')
    expect(enabled.at(-1)).toBe(false)

    act(() => result.current.setMode('archived'))

    expect(enabled.at(-1)).toBe(true)
  })

  it('achata o DTO composto para uma forma só', () => {
    // A tabela não pode ter duas formas: o achatamento vive aqui, não na tela.
    const { result } = renderHook(() =>
      useArchivedPage(
        fakeResource({
          data: [
            {
              client: { id: 7, name: 'Switch' },
              archived_at: '2026-08-18T10:00:00-03:00',
              archived_by: 'Ana Torres',
            },
          ],
        }),
      ),
    )

    act(() => result.current.setMode('archived'))

    expect(result.current.items).toEqual([
      { id: 7, name: 'Switch', archived_at: '2026-08-18T10:00:00-03:00', archived_by: 'Ana Torres' },
    ])
  })

  it('distingue lista vazia de GET falho', () => {
    const vazio = renderHook(() => useArchivedPage(fakeResource({ data: [] })))
    expect(vazio.result.current.items).toEqual([])
    expect(vazio.result.current.error).toBeNull()

    const falho = renderHook(() =>
      useArchivedPage(fakeResource({ isError: true, error: { detail: 'boom' } as ProblemDetails })),
    )
    expect(falho.result.current.error?.detail).toBe('boom')
  })

  it('restore repassa o id', () => {
    const onRestore = vi.fn()
    const { result } = renderHook(() => useArchivedPage(fakeResource({ data: [], onRestore })))

    act(() => result.current.restore(7))

    expect(onRestore).toHaveBeenCalledWith(7)
  })

  it('refetch devolve a promise (Q-14)', () => {
    const { result } = renderHook(() => useArchivedPage(fakeResource({ data: [] })))

    expect(result.current.refetch()).toBeInstanceOf(Promise)
  })
})
