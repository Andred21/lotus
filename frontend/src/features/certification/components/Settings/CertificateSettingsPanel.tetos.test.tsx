import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { CertificateSettingsPanel } from './CertificateSettingsPanel'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

describe('CertificateSettingsPanel — tetos', () => {
  it('limita nome e cargo aos tetos que o certificado imprime', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { manager_name: 'Marcia de Batalha', manager_title: 'Gerente OTEC', signature: null },
    })
    renderWithProviders(<CertificateSettingsPanel />, { route: '/' })

    expect((await screen.findByDisplayValue('Marcia de Batalha')).getAttribute('maxlength')).toBe('60')
    expect(screen.getByDisplayValue('Gerente OTEC').getAttribute('maxlength')).toBe('70')
  })
})
