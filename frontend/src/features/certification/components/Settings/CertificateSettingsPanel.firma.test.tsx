import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { fileToRaster, rasterToPngFile } from '@shared/lib/signature/canvasBridge'
import { escolherImagem, nomesDosIcones, raster } from '@shared/testing/signature'
import type { CertificateSettingsData } from '@shared/types/generated'
import { CertificateSettingsPanel } from './CertificateSettingsPanel'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

vi.mock('@shared/lib/signature/canvasBridge', () => ({ fileToRaster: vi.fn(), rasterToPngFile: vi.fn() }))

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

describe('CertificateSettingsPanel — a firma no padrão do slot', () => {
  it('com firma: imagem sobre o xadrez e a linha com os quatro ícones com dica', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: comFirma })
    renderWithProviders(<CertificateSettingsPanel />, { route: '/' })

    expect((await screen.findByRole('img', { name: 'gerente.png' })).getAttribute('src')).toBe('https://x/gerente.png')
    // O Guardar do form vem depois da linha da firma: só os quatro primeiros são dela.
    expect(nomesDosIcones().slice(0, 4)).toEqual([
      'common.preview', 'common.download', 'certificateSettings.replaceSignature', 'certificateSettings.removeSignature',
    ])
    expect(screen.getByText('signature.hint')).toBeTruthy()
  })

  it('substituir a firma abre a prévia para confirmar o envio', async () => {
    vi.mocked(fileToRaster).mockResolvedValue(raster())
    vi.mocked(rasterToPngFile).mockResolvedValue(new File(['png'], 'firma.png', { type: 'image/png' }))
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(api, 'get').mockResolvedValue({ data: comFirma })
    const { container } = renderWithProviders(<CertificateSettingsPanel />, { route: '/' })
    await screen.findByRole('img', { name: 'gerente.png' })

    await escolherImagem(container)

    expect(screen.getByRole('button', { name: 'signature.confirm' })).toBeTruthy()
  })

  it('excluir abre um diálogo só, com o texto do gerente', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: comFirma })
    renderWithProviders(<CertificateSettingsPanel />, { route: '/' })

    fireEvent.click(await screen.findByRole('button', { name: 'certificateSettings.removeSignature' }))

    await screen.findByText('certificateSettings.removeTitle')
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
  })
})
