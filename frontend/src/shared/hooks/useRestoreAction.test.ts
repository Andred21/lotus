import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ProblemDetails } from '@shared/api/axios'
import { useRestoreAction } from './useRestoreAction'

const toasts = vi.hoisted(() => ({ restored: vi.fn(), failed: vi.fn() }))
vi.mock('./useArchiveToasts', () => ({ useArchiveToasts: () => toasts }))

describe('useRestoreAction', () => {
  it('sucesso: toast de restaurado e o onSuccess do chamador', () => {
    const ok = vi.fn()
    const { result } = renderHook(() =>
      useRestoreAction({ mutate: (_id, options) => options?.onSuccess?.(), isPending: false }),
    )

    act(() => result.current.restore(7, { onSuccess: ok }))

    expect(toasts.restored).toHaveBeenCalled()
    expect(ok).toHaveBeenCalled()
  })

  it('falha: toast de erro com o problema e o onError do chamador', () => {
    const problema = { detail: 'sin permiso' } as ProblemDetails
    const falhou = vi.fn()
    const { result } = renderHook(() =>
      useRestoreAction({ mutate: (_id, options) => options?.onError?.(problema), isPending: false }),
    )

    act(() => result.current.restore(7, { onError: falhou }))

    expect(toasts.failed).toHaveBeenCalledWith(problema)
    expect(falhou).toHaveBeenCalledWith(problema)
  })
})
