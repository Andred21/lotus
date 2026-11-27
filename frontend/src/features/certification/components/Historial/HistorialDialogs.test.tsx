import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { CertificateData } from '@shared/types/generated'
import type { useHistorial } from '../../hooks/useHistorial'
import { HistorialDialogs } from './HistorialDialogs'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@shared/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/ui')>()),
  useToast: () => toast,
}))

vi.mock('../../api/certificatesApi', () => ({
  useRevokeCertificate: () => ({
    mutate: (_vars: unknown, o?: { onSuccess?: () => void }) => o?.onSuccess?.(),
    isPending: false,
    error: null,
  }),
}))

const CERTIFICADO = {
  id: 1,
  codigo: 'LOT-2026-1001',
  snapshot: { aluno: { name: 'Ana Torres' } },
} as unknown as CertificateData

describe('HistorialDialogs — revogar (C-5)', () => {
  it('revogar mostra toast e fecha o diálogo', () => {
    const setRevoking = vi.fn()
    const h = {
      viewingCertificateId: null,
      revoking: CERTIFICADO,
      setRevoking,
      reissuing: null,
    } as unknown as ReturnType<typeof useHistorial>
    renderWithProviders(<HistorialDialogs h={h} />)

    fireEvent.change(screen.getByLabelText('certificate.revokeReason'), { target: { value: 'Error de emisión' } })
    fireEvent.click(screen.getByRole('button', { name: 'certificate.revokeConfirm' }))

    expect(toast.success).toHaveBeenCalledWith('certificate.revokedToast')
    expect(setRevoking).toHaveBeenCalledWith(null)
  })
})
