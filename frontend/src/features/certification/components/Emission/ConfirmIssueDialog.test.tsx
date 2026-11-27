import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'
import { ConfirmIssueDialog } from './ConfirmIssueDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('../../api/certificatesApi', () => ({
  useIssueCertificate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const ALUNO: EmissionPanelEnrollmentData = {
  enrollment_id: 10, student_name: 'Ana Torres', student_rut: '11.111.111-1', approval_status: 'aprobado',
  attendance_pct: '90', nota_final: '6.5', certificate: null, student_photo_url: null,
}

const turma = (n: number): EmissionPanelTurmaData => ({
  turma_id: 1, quote_code: 'Scap 1 - R1', course_name: 'Alta tensión', client_name: 'Enel', end_date: '2026-07-24',
  emission_blocked: null, enrollments: [ALUNO], manager_signature_missing: false,
  redatores: Array.from({ length: n }, (_, i) => ({ redator_id: i + 1, name: `Relator ${i + 1}`, has_firma: true })),
})

const montar = (n: number) =>
  renderWithProviders(<ConfirmIssueDialog enrollment={ALUNO} turma={turma(n)} onHide={() => {}} onIssued={() => {}} />)

/** Texto dos elementos que o `aria-describedby` do nó aponta. */
const descricao = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim()

describe('ConfirmIssueDialog — motivo do botão desabilitado', () => {
  it('Emitir sem redator mostra o motivo visível', () => {
    montar(2)

    const emitir = screen.getByRole('button', { name: 'certificate.confirmEmit' }) as HTMLButtonElement
    expect(emitir.disabled).toBe(true)
    const motivo = screen.getByText('certificate.issueNeedsRedator')
    expect(motivo.className).not.toContain('sr-only')
  })

  it('o motivo é a descrição acessível do Emitir desabilitado', () => {
    montar(2)

    const emitir = screen.getByRole('button', { name: 'certificate.confirmEmit' })
    expect(descricao(emitir)).toBe('certificate.issueNeedsRedator')
  })

  it('o campo do redator sai marcado como obrigatório', () => {
    montar(2)

    // O placeholder repete o rótulo, então há mais de um nó com esse nome.
    const controles = screen.getAllByLabelText('certificate.fieldRedator')
    expect(controles.some((c) => c.getAttribute('aria-required') === 'true')).toBe(true)
  })

  it('redator único já escolhido: botão habilitado e sem aviso', () => {
    montar(1)

    expect((screen.getByRole('button', { name: 'certificate.confirmEmit' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText('certificate.issueNeedsRedator')).toBeNull()
  })
})
