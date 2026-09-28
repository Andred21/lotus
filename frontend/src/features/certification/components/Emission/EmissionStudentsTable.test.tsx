import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import type { EmissionPanelEnrollmentData } from '@shared/types/generated'
import type { EmissionCounts } from '../../hooks/useEmissionPanelState'
import { EmissionStudentsTable } from './EmissionStudentsTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const SEM_CERTIFICADO: EmissionPanelEnrollmentData = {
  enrollment_id: 10, student_name: 'Ana Torres', student_rut: '11.111.111-1', approval_status: 'aprobado',
  attendance_pct: '90', nota_final: '6.5', certificate: null, student_photo_url: null,
}
const COM_CERTIFICADO = {
  ...SEM_CERTIFICADO,
  enrollment_id: 11,
  student_name: 'Luis Rojas',
  certificate: { codigo: 'LOT-2026-1001' },
} as unknown as EmissionPanelEnrollmentData
const CONTAGEM: EmissionCounts = { total: 2, aprobados: 2, emitidos: 1, pendientes: 1 }

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

function montar(over: { blocked?: boolean; onEmit?: () => void } = {}) {
  return renderWithProviders(
    <EmissionStudentsTable
      enrollments={[SEM_CERTIFICADO, COM_CERTIFICADO]}
      counts={CONTAGEM}
      loading={false}
      blocked={over.blocked ?? false}
      blockedReasonId="motivo-do-bloqueio"
      onEmit={over.onEmit ?? (() => {})}
      onView={() => {}}
    />,
  )
}

/** Item 23 (`D-65`): "Emitir" e "Ver" eram botões de texto numa presa de 8rem
 * que cobria 84px de "Certificado" em 1024x768 e 95px do nome em 390x844. */
describe('EmissionStudentsTable — ação da linha', () => {
  it('no desktop, emitir e ver são ícones com nome acessível, numa coluna de 6rem', () => {
    montar()

    expect(screen.getByRole('button', { name: 'certificate.emit' }).textContent?.trim()).toBe('')
    expect(screen.getByRole('button', { name: 'certificate.view' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('6rem')
  })

  it('emitir chama onEmit com a matrícula da linha', () => {
    const onEmit = vi.fn()
    montar({ onEmit })

    fireEvent.click(screen.getByRole('button', { name: 'certificate.emit' }))
    expect(onEmit).toHaveBeenCalledWith(SEM_CERTIFICADO)
  })

  it('turma bloqueada: emitir apagado aponta para o motivo (f3 UI-03)', () => {
    montar({ blocked: true })

    const emitir = screen.getByRole('button', { name: 'certificate.emit' })
    expect(emitir.hasAttribute('disabled')).toBe(true)
    expect(emitir.getAttribute('aria-describedby')).toBe('motivo-do-bloqueio')
  })

  it('em 390px a coluna encolhe para o botão, que segue sendo o próprio emitir', () => {
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'certificate.emit' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })
})
