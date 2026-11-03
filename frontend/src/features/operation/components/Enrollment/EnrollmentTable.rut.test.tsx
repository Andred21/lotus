import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { EnrollmentData } from '@shared/types/generated'
import { EnrollmentTable } from './EnrollmentTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const MATRICULA: EnrollmentData = {
  id: 5, turma_id: 1, student_id: 9, name: 'Ana Torres', rut: '16.200.021-7', email: null, phone: null,
  approval_status: undefined, attendance_pct: null, grades: null, result_locked: false, photo_url: null,
}

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** P-101: a 390px o RUT quebrava no hífen. */
describe('EnrollmentTable — RUT', () => {
  it('renderiza o RUT inteiro num span mono e sem quebra de linha', () => {
    renderWithProviders(
      <EnrollmentTable
        turmaId={1} loading={false} removing={false} onRemove={() => {}} onResetRemove={() => {}}
        registroBloqueado={false} enrollments={[MATRICULA]}
      />,
    )

    const rut = screen.getByText('16.200.021-7')
    expect(rut.tagName).toBe('SPAN')
    expect(rut.className).toContain('whitespace-nowrap')
    expect(rut.className).toContain('font-mono')
  })
})
