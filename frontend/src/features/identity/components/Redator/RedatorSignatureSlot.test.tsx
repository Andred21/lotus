import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { fileToRaster, rasterToPngFile } from '@shared/lib/signature/canvasBridge'
import { escolherImagem, nomesDosIcones, raster } from '@shared/testing/signature'
import type { RedatorDocumentData } from '@shared/types/generated'
import { RedatorSignatureSlot } from './RedatorSignatureSlot'

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

const existente: RedatorDocumentData = {
  id: 7, type: 'FIRMA', original_name: 'firma.png', mime: 'image/png', size: 2048,
  valid_until: null, created_at: '2026-10-01T10:00:00Z', download_url: 'https://x/firma.png',
}

function montar(over: Partial<Parameters<typeof RedatorSignatureSlot>[0]> = {}) {
  const props = {
    mode: 'edit' as const,
    doc: undefined,
    staged: undefined,
    uploading: false,
    onStage: vi.fn(),
    onUnstage: vi.fn(),
    onUpload: vi.fn(() => Promise.resolve(true)),
    onRemoveDoc: vi.fn(),
    onPreview: vi.fn(),
    ...over,
  }
  const { container } = render(<RedatorSignatureSlot {...props} />)
  return { props, container }
}

describe('RedatorSignatureSlot', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(fileToRaster).mockResolvedValue(raster())
    vi.mocked(rasterToPngFile).mockResolvedValue(limpo)
  })

  it('em edição com firma mostra ver, baixar, substituir e excluir, nessa ordem', () => {
    montar({ doc: existente })

    expect(screen.getByText('documentType.FIRMA')).toBeTruthy()
    expect(nomesDosIcones()).toEqual(['common.preview', 'common.download', 'redator.signatureReplace', 'common.delete'])
  })

  it('onde dá para enviar a dica de formatos fica visível, com ou sem firma, e continua com a prévia aberta', async () => {
    const { container } = montar({ doc: existente })

    expect(screen.getByText('signature.hint')).toBeTruthy()
    await escolherImagem(container)
    expect(screen.getByText('signature.hint')).toBeTruthy()
  })

  it('em edição sem firma mostra só o enviar, com o nome de enviar assinatura', () => {
    montar()

    expect(screen.getByText('common.notLoaded')).toBeTruthy()
    expect(nomesDosIcones()).toEqual(['redator.signatureChoose'])
  })

  it('escolher a imagem mostra a prévia abaixo da linha, e Confirmar sobe o PNG limpo', async () => {
    const { props, container } = montar({ doc: existente })

    await escolherImagem(container)
    const decidir = screen.getByRole('button', { name: 'signature.confirm' })
    expect(screen.getByText('firma.png').compareDocumentPosition(decidir) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(decidir)

    expect(props.onUpload).toHaveBeenCalledWith(limpo)
    expect(props.onStage).not.toHaveBeenCalled()
  })

  it('a prévia some depois do envio aceito', async () => {
    const { container } = montar({ doc: existente })
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    await waitFor(() => expect(screen.queryByRole('img', { name: 'signature.previewAlt' })).toBeNull())
  })

  it('a prévia fica quando o servidor recusa o envio', async () => {
    const onUpload = vi.fn(() => Promise.resolve(false))
    const { container } = montar({ doc: existente, onUpload })
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    await waitFor(() => expect(onUpload).toHaveBeenCalled())
    expect(screen.getByRole('img', { name: 'signature.previewAlt' })).toBeTruthy()
  })

  it('excluir a firma pede confirmação e só então chama onRemoveDoc', async () => {
    const { props } = montar({ doc: existente })

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    expect(props.onRemoveDoc).not.toHaveBeenCalled()
    // Com o diálogo aberto o "sim" é o segundo botão com o rótulo de excluir.
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'common.delete' }).length).toBeGreaterThan(1))
    fireEvent.click(screen.getAllByRole('button', { name: 'common.delete' }).at(-1)!)

    await waitFor(() => expect(props.onRemoveDoc).toHaveBeenCalledWith(7))
  })

  it('não mostra tag de status nem validade', () => {
    montar({ doc: existente })

    expect(screen.queryByText(/documentStatus/)).toBeNull()
  })

  it('formato ilegível mostra o erro e não oferece Confirmar', async () => {
    const { UnsupportedImageError } = await import('@shared/lib/signature')
    vi.mocked(fileToRaster).mockRejectedValue(new UnsupportedImageError())
    const { container } = montar({ doc: existente })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.heic', { type: 'image/heic' })] } })

    expect((await screen.findByRole('alert')).textContent).toBe('signature.errorUnsupported')
    expect(screen.queryByRole('button', { name: 'signature.confirm' })).toBeNull()
  })
})
