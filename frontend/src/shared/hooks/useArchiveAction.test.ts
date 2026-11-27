import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ProblemDetails } from '@shared/api/axios'
import { useArchiveAction } from './useArchiveAction'

const toasts = vi.hoisted(() => ({ archived: vi.fn(), failed: vi.fn() }))
vi.mock('./useArchiveToasts', () => ({ useArchiveToasts: () => toasts }))

type Options = { onSuccess?: () => void; onError?: (problem: ProblemDetails) => void }

const gate = { errors: { status: ['Turma concluida no se puede archivar'] } } as unknown as ProblemDetails

function montar(mutate: (id: number, options?: Options) => void) {
  return renderHook(() => useArchiveAction({ mutate, isPending: false }))
}

describe('useArchiveAction', () => {
  it('sucesso: toast de arquivado e o onSuccess do chamador, sem erro', () => {
    const ok = vi.fn()
    const { result } = montar((_id, o) => o?.onSuccess?.())

    act(() => result.current.archive(7, { onSuccess: ok }))

    expect(toasts.archived).toHaveBeenCalled()
    expect(ok).toHaveBeenCalled()
    expect(result.current.archiveError).toBeNull()
  })

  it('erro do gate vai ao diálogo, não ao toast', () => {
    toasts.failed.mockClear()
    const { result } = montar((_id, o) => o?.onError?.(gate))

    act(() => result.current.archive(7))

    expect(result.current.archiveError).toBe('Turma concluida no se puede archivar')
    expect(toasts.failed).not.toHaveBeenCalled()
  })

  it('o erro some ao reabrir e ao tentar de novo', () => {
    let falhar = true
    const { result } = montar((_id, o) => (falhar ? o?.onError?.(gate) : o?.onSuccess?.()))

    act(() => result.current.archive(7))
    expect(result.current.archiveError).not.toBeNull()

    act(() => result.current.resetArchiveError())
    expect(result.current.archiveError).toBeNull()

    act(() => result.current.archive(7))
    expect(result.current.archiveError).not.toBeNull()
    falhar = false
    act(() => result.current.archive(7))
    expect(result.current.archiveError).toBeNull()
  })
})
