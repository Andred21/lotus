import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import type { CertificateSettingsData } from '@shared/types/generated'
import { CertificateSettingsPanel } from './CertificateSettingsPanel'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const comFirma: CertificateSettingsData = {
  manager_name: 'Marcia de Batalha',
  manager_title: 'Gerente OTEC',
  signature: { original_name: 'gerente.png', size: 2048, created_at: '2026-10-01T10:00:00Z', download_url: 'https://x/gerente.png' },
}

afterEach(() => vi.restoreAllMocks())

/**
 * Q-1 do review do bloco 40. Os botões da firma moram dentro do `<form>` de nome e
 * cargo, com os componentes reais de `shared/ui` (sem o dublê do seletor do outro
 * arquivo). Sem `type="button"`, Ver, Descargar e Quitar enviavam o form e gravavam
 * o texto da tela, que sai em todo certificado (D5), sem o Guardar.
 */
describe('CertificateSettingsPanel — botões da firma não enviam o form', () => {
  it('ver, baixar e remover a firma não gravam nome e cargo', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: comFirma })
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: comFirma })
    vi.spyOn(window, 'open').mockImplementation(() => null)
    renderWithProviders(<CertificateSettingsPanel />, { route: '/' })
    fireEvent.change(await screen.findByDisplayValue('Marcia de Batalha'), { target: { value: 'Marcia a medio escribir' } })

    fireEvent.click(screen.getByRole('button', { name: 'common.preview' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.download' }))
    fireEvent.click(screen.getByRole('button', { name: 'certificateSettings.removeSignature' }))

    await screen.findByRole('button', { name: 'certificateSettings.removeConfirm' })
    expect(put).not.toHaveBeenCalled()
  })
})
