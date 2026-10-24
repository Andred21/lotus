import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useRegisterResult } from './useRegisterResult'
import { api } from '@shared/api/axios'
import type { ApprovalRuleData, EnrollmentData } from '@shared/types/generated'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    // `t` devolve chave + parâmetros: o teste prova o que o aviso diz, não a tradução.
    useTranslation: mockUseTranslation({
      language: 'es-CL',
      t: (key, opts) => (opts ? `${key}|${JSON.stringify(opts)}` : key),
    }),
  }
})

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
    result_locked: false,
    photo_url: null,
  }
}

describe('useRegisterResult', () => {
  beforeEach(() => put.mockClear())

  it('preserva as demais chaves de grades e omite `final` quando a nota fica vazia', async () => {
    put.mockResolvedValue({ data: {} })
    const enrollment = enrollmentWith({ final: '5,0', comentario: 'recuperación' })

    const { result } = renderHook(() => useRegisterResult(1, enrollment, true, undefined), { wrapper })

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

    const { result } = renderHook(() => useRegisterResult(1, enrollment, true, undefined), { wrapper })

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

    const { result } = renderHook(() => useRegisterResult(1, enrollment, true, undefined), { wrapper })

    act(() => result.current.setStatus('reprobado'))
    act(() => result.current.submit())

    await waitFor(() => expect(put).toHaveBeenCalled())
    const body = put.mock.calls[0][1] as { grades: unknown }
    // `{}` gravaria `[]` na coluna e sujaria a auditoria da matrícula com uma
    // mudança de nota que não houve.
    expect(body.grades).toBeNull()
  })

  describe('com a regra mínima da turma', () => {
    const RULE: ApprovalRuleData = { min_grade: 4, min_attendance_pct: 70 }
    const vazia = (): EnrollmentData => ({ ...enrollmentWith(null), attendance_pct: null })
    const montar = (e: EnrollmentData, rule: ApprovalRuleData | null = RULE) =>
      renderHook(() => useRegisterResult(1, e, true, rule ?? undefined), { wrapper })

    it('sugere o status ao digitar nota e presença, e o aviso aparece ao divergir sem bloquear o salvar', async () => {
      put.mockResolvedValue({ data: {} })
      const { result } = montar(vazia())

      act(() => result.current.setFinalGrade('5'))
      act(() => result.current.setAttendance('80'))
      expect(result.current.form.approval_status).toBe('aprobado')
      expect(result.current.ruleWarning).toBeNull()

      act(() => result.current.setStatus('reprobado'))
      expect(result.current.ruleWarning).toContain('certificate.result.ruleSuggestsApproved')
      expect(result.current.ruleWarning).toContain('"grade":"5"')
      expect(result.current.ruleWarning).toContain('"attendance":"80"')
      expect(result.current.ruleWarning).toContain('"minGrade":"4,0"')
      expect(result.current.ruleWarning).toContain('"minAttendance":"70"')

      act(() => result.current.submit())
      await waitFor(() => expect(put).toHaveBeenCalled())
      expect((put.mock.calls[0][1] as { approval_status: string }).approval_status).toBe('reprobado')
    })

    it('uma nova digitação volta a seguir a regra', () => {
      const { result } = montar(vazia())
      act(() => result.current.setFinalGrade('5'))
      act(() => result.current.setAttendance('80'))
      act(() => result.current.setStatus('reprobado'))

      act(() => result.current.setFinalGrade('6'))

      expect(result.current.form.approval_status).toBe('aprobado')
      expect(result.current.ruleWarning).toBeNull()
    })

    it('reprovação pela regra usa o aviso de reprovado', () => {
      const { result } = montar(vazia())
      act(() => result.current.setFinalGrade(' 3,9 '))
      act(() => result.current.setAttendance('100'))
      expect(result.current.form.approval_status).toBe('reprobado')

      act(() => result.current.setStatus('aprobado'))

      expect(result.current.ruleWarning).toContain('certificate.result.ruleSuggestsFailed')
      expect(result.current.ruleWarning).toContain('"grade":"3,9"')
    })

    it('abre matrícula pendente com nota e presença sem mudar o status, mas já avisa a divergência', () => {
      const e = { ...enrollmentWith({ final: '5' }), attendance_pct: '80' }
      const { result } = montar(e)

      expect(result.current.form.approval_status).toBe('pendiente')
      expect(result.current.ruleWarning).toContain('certificate.result.ruleSuggestsApproved')

      act(() => result.current.setAttendance('85'))
      expect(result.current.form.approval_status).toBe('aprobado')
      expect(result.current.ruleWarning).toBeNull()
    })

    it('apagar a nota depois de sugerir mantém o status', () => {
      const { result } = montar(vazia())
      act(() => result.current.setFinalGrade('5'))
      act(() => result.current.setAttendance('80'))
      expect(result.current.form.approval_status).toBe('aprobado')

      act(() => result.current.setFinalGrade(''))

      expect(result.current.form.approval_status).toBe('aprobado')
      expect(result.current.ruleWarning).toBeNull()
    })

    it('sem regra nada muda sozinho e não há aviso', () => {
      const { result } = montar(vazia(), null)
      act(() => result.current.setFinalGrade('5'))
      act(() => result.current.setAttendance('80'))

      expect(result.current.form.approval_status).toBe('pendiente')
      expect(result.current.ruleWarning).toBeNull()
    })
  })
})
