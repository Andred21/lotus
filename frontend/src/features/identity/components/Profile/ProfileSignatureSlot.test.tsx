import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { fileToRaster, rasterToPngFile } from '@shared/lib/signature/canvasBridge'
import { escolherImagem, nomesDosIcones, raster } from '@shared/testing/signature'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { ProfileSignatureSlot } from './ProfileSignatureSlot'

// `t` devolve a chave: o que se prova é qual texto o slot escolhe.
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

const enviada = {
  original_name: 'firma.png', size: 2048, download_url: 'https://x/firma.png', created_at: '2026-10-01T10:00:00Z',
}

function doc(over: Partial<RedatorProfileDocumentData> = {}): RedatorProfileDocumentData {
  return {
    type: 'FIRMA', status: 'vigente', self_service: true, valid_until: null,
    original_name: null, size: null, created_at: null, download_url: null, ...over,
  }
}

function montar(
  over: Partial<RedatorProfileDocumentData> = {},
  onUpload = vi.fn<(file: File) => Promise<boolean>>(() => Promise.resolve(true)),
) {
  const { container } = render(<ProfileSignatureSlot doc={doc(over)} uploading={false} onUpload={onUpload} onPreview={() => {}} />)
  return { onUpload, container }
}

describe('ProfileSignatureSlot', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(fileToRaster).mockResolvedValue(raster())
    vi.mocked(rasterToPngFile).mockResolvedValue(limpo)
  })

  it('sem assinatura mostra o enviar, sobe o PNG limpo e não mostra status', async () => {
    const { onUpload, container } = montar()

    expect(screen.queryByText(/profile\.docStatus|documentStatus/)).toBeNull()
    expect(nomesDosIcones()).toEqual(['profile.documents.sendSignature'])
    await escolherImagem(container)
    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    expect(onUpload).toHaveBeenCalledWith(limpo)
    await waitFor(() => expect(screen.queryByRole('img', { name: 'signature.previewAlt' })).toBeNull())
  })

  it('com assinatura enviada mostra ver, baixar e substituir, e nunca excluir', () => {
    montar(enviada)

    expect(screen.getByText('firma.png')).toBeTruthy()
    expect(nomesDosIcones()).toEqual(['common.preview', 'common.download', 'profile.documents.replaceSignature'])
    expect(screen.queryByRole('button', { name: 'common.delete' })).toBeNull()
  })

  it('a prévia fica quando o servidor recusa o envio', async () => {
    const { onUpload, container } = montar({}, vi.fn<(file: File) => Promise<boolean>>(() => Promise.resolve(false)))
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    await waitFor(() => expect(onUpload).toHaveBeenCalled())
    expect(screen.getByRole('img', { name: 'signature.previewAlt' })).toBeTruthy()
  })

  it('sem self_service avisa que o administrador gere e não oferece enviar nem substituir', () => {
    montar({ self_service: false, ...enviada })

    expect(screen.getByText('profile.documents.managedByAdmin')).toBeTruthy()
    expect(nomesDosIcones()).toEqual(['common.preview', 'common.download'])
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('sem self_service e sem arquivo mostra "não carregado" e o aviso, sem botão', () => {
    montar({ self_service: false })

    expect(screen.getByText('common.notLoaded')).toBeTruthy()
    expect(screen.getByText('profile.documents.managedByAdmin')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
