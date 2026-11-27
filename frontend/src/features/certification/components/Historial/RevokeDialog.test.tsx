import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { CertificateData } from '@shared/types/generated'
import { RevokeDialog } from './RevokeDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('../../api/certificatesApi', () => ({
  useRevokeCertificate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const CERTIFICADO = {
  id: 1,
  codigo: 'LOT-2026-1001',
  snapshot: { aluno: { name: 'Ana Torres' } },
} as unknown as CertificateData

const montar = () =>
  renderWithProviders(<RevokeDialog certificate={CERTIFICADO} onHide={() => {}} onRevoked={() => {}} />)

describe('RevokeDialog — motivo do botão desabilitado', () => {
  it('Revocar desabilitado mostra o motivo visível', () => {
    montar()

    const revocar = screen.getByRole('button', { name: 'certificate.revokeConfirm' }) as HTMLButtonElement
    expect(revocar.disabled).toBe(true)
    const motivo = screen.getByText('certificate.revokeNeedsReason')
    // Texto na tela, não só dica de mouse: nada de sr-only nem de title.
    expect(motivo.className).not.toContain('sr-only')
  })

  it('o campo do motivo sai marcado como obrigatório', () => {
    montar()

    expect(screen.getByLabelText('certificate.revokeReason').getAttribute('aria-required')).toBe('true')
  })

  it('com o motivo escrito o botão habilita e o aviso some', () => {
    montar()

    fireEvent.change(screen.getByLabelText('certificate.revokeReason'), { target: { value: 'Error de emisión' } })

    expect((screen.getByRole('button', { name: 'certificate.revokeConfirm' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText('certificate.revokeNeedsReason')).toBeNull()
  })
})
