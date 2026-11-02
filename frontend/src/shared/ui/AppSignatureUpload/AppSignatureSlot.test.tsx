import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fileToRaster, rasterToPngFile } from '@shared/lib/signature/canvasBridge'
import { escolherImagem, raster } from '@shared/testing/signature'
import { AppSignatureSlot, type AppSignatureSlotProps } from './AppSignatureSlot'

/**
 * A regra que as três telas de assinatura (firma do redator, Mi perfil, firma da
 * gerente) precisam ter igual, num lugar só (Q-3 da revisão do bloco 47): só
 * sobe o PNG limpo, e a prévia só sai quando o destino ACEITA.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

// A limpeza em canvas não roda no jsdom; o resto do fluxo (slot, prévia, hook) é real.
vi.mock('@shared/lib/signature/canvasBridge', () => ({
  fileToRaster: vi.fn(),
  rasterToPngFile: vi.fn(),
}))

const limpo = new File(['png'], 'firma.png', { type: 'image/png' })

function montar(over: Partial<AppSignatureSlotProps<{ original_name: string; mime: string; size: number; download_url: string }>> = {}) {
  return render(
    <AppSignatureSlot title="Firma" file={null} onPreview={vi.fn()} uploading={false} onConfirm={vi.fn(() => true)} {...over} />,
  )
}

describe('AppSignatureSlot', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(fileToRaster).mockResolvedValue(raster())
    vi.mocked(rasterToPngFile).mockResolvedValue(limpo)
  })

  it('Confirmar entrega o PNG limpo, nunca o original', async () => {
    const onConfirm = vi.fn(() => true)
    const { container } = montar({ onConfirm })
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    expect(onConfirm).toHaveBeenCalledWith(limpo)
  })

  it('aceite síncrono (stage) tira a prévia na hora', async () => {
    const { container } = montar({ onConfirm: () => true })
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    expect(screen.queryByRole('img', { name: 'signature.previewAlt' })).toBeNull()
  })

  it('aceite do servidor tira a prévia', async () => {
    const { container } = montar({ onConfirm: () => Promise.resolve(true) })
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    await waitFor(() => expect(screen.queryByRole('img', { name: 'signature.previewAlt' })).toBeNull())
  })

  it('recusa do servidor deixa a prévia, a um clique de reenviar', async () => {
    const onConfirm = vi.fn(() => Promise.resolve(false))
    const { container } = montar({ onConfirm })
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(screen.getByRole('img', { name: 'signature.previewAlt' })).toBeTruthy()
  })

  it('sem onConfirm não há enviar, nem dica de formatos, nem vão vazio abaixo da linha', () => {
    const { container } = montar({ onConfirm: undefined })

    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(screen.queryByText('signature.hint')).toBeNull()
  })

  it('com onConfirm a dica de formatos fica visível', () => {
    montar()

    expect(screen.getByText('signature.hint')).toBeTruthy()
  })

  it('o corpo extra vem antes da dica', () => {
    montar({ children: <p>extra</p> })

    const extra = screen.getByText('extra')
    expect(extra.compareDocumentPosition(screen.getByText('signature.hint')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
