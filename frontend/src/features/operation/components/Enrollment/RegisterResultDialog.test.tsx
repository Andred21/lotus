import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { ApprovalRuleData, EnrollmentData } from '@shared/types/generated'
import { RegisterResultDialog } from './RegisterResultDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const RULE: ApprovalRuleData = { min_grade: 4, min_attendance_pct: 70 }

// Nota e presença que a regra aprova, com o status ainda pendente: divergência.
const DIVERGENTE: EnrollmentData = {
  id: 5, turma_id: 1, student_id: 9, name: 'Ana Torres', rut: '11.111.111-1', email: null, phone: null,
  approval_status: 'pendiente', attendance_pct: '80', grades: { final: '5' } as never,
  result_locked: false, photo_url: null,
}

const montar = (enrollment: EnrollmentData) =>
  renderWithProviders(
    <RegisterResultDialog turmaId={1} enrollment={enrollment} visible approvalRule={RULE} onHide={() => {}} />,
  )

describe('RegisterResultDialog — aviso da regra mínima', () => {
  it('mostra o aviso quando o status diverge da regra, sem desabilitar o Salvar', () => {
    montar(DIVERGENTE)

    expect(screen.getByText('certificate.result.ruleSuggestsApproved')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'common.save' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('sem divergência não há aviso', () => {
    montar({ ...DIVERGENTE, approval_status: 'aprobado' })

    expect(screen.queryByText('certificate.result.ruleSuggestsApproved')).toBeNull()
  })
})
