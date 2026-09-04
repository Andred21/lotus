import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useRegisterResult } from './useRegisterResult'
import { api } from '@shared/api/axios'
import type { EnrollmentData } from '@shared/types/generated'

vi.mock('@shared/api/axios', () => ({
  api: { put: vi.fn() },
}))

const put = vi.mocked(api.put)

const { wrapper } = createWrapper()

// `grades` chega como objeto (`{final: ..., comentario: ...}`) apesar do tipo
// gerado dizer `Array<any>` — o transformer não distingue mapa de lista em
// PHP (mesma nota do `useRegisterResult.ts`).
function enrollmentWith(grades: Record<string, unknown> | null): EnrollmentData {
  return {
    id: 5,
    turma_id: 1,
    student_id: 9,
    name: 'Ana Pérez',
    rut: '11.111.111-1',
    email: null,
    phone: null,
    approval_status: 'pendiente',
    attendance_pct: '80',
    grades: grades as unknown as EnrollmentData['grades'],
    photo_url: null,
  }
}

describe('useRegisterResult', () => {
  beforeEach(() => put.mockClear())

  it('preserva as demais chaves de grades e omite `final` quando a nota fica vazia', async () => {
    put.mockResolvedValue({ data: {} })
    const enrollment = enrollmentWith({ final: '5,0', comentario: 'recuperación' })

    const { result } = renderHook(() => useRegisterResult(1, enrollment, true), { wrapper })

    act(() => result.current.setFinalGrade(''))
    act(() => result.current.submit())

    await waitFor(() => expect(put).toHaveBeenCalled())
    const body = put.mock.calls[0][1] as { grades: Record<string, unknown> }
    expect(body.grades).toEqual({ comentario: 'recuperación' })
    expect('final' in body.grades).toBe(false)
  })

  it('envia a nota como texto livre, sem coerção numérica, e mantém as outras chaves', async () => {
    put.mockResolvedValue({ data: {} })
    const enrollment = enrollmentWith({ comentario: 'recuperación' })

    const { result } = renderHook(() => useRegisterResult(1, enrollment, true), { wrapper })

    act(() => result.current.setFinalGrade('6,9'))
    act(() => result.current.setStatus('aprobado'))
    act(() => result.current.submit())

    await waitFor(() => expect(put).toHaveBeenCalled())
    const body = put.mock.calls[0][1] as { grades: Record<string, unknown>; approval_status: string }
    expect(body.grades.final).toBe('6,9')
    expect(body.grades.comentario).toBe('recuperación')
    expect(body.approval_status).toBe('aprobado')
  })

  it('manda `grades` nulo quando a matrícula não tem nota nenhuma e a nota fica vazia', async () => {
    put.mockResolvedValue({ data: {} })
    const enrollment = enrollmentWith(null)

    const { result } = renderHook(() => useRegisterResult(1, enrollment, true), { wrapper })

    act(() => result.current.setStatus('reprobado'))
    act(() => result.current.submit())

    await waitFor(() => expect(put).toHaveBeenCalled())
    const body = put.mock.calls[0][1] as { grades: unknown }
    // `{}` gravaria `[]` na coluna e sujaria a auditoria da matrícula com uma
    // mudança de nota que não houve.
    expect(body.grades).toBeNull()
  })
})
