import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

function propsBase(over: Partial<Parameters<typeof RedatorSignatureSlot>[0]> = {}) {
  return {
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
}

function montar(over: Partial<Parameters<typeof RedatorSignatureSlot>[0]> = {}) {
  const props = propsBase(over)
  const { container } = render(<RedatorSignatureSlot {...props} />)
  return { props, container }
}

describe('RedatorSignatureSlot — visualização e criação', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(fileToRaster).mockResolvedValue(raster())
    vi.mocked(rasterToPngFile).mockResolvedValue(limpo)
  })

  it('em visualização só há ver e baixar, sem enviar nem excluir', () => {
    montar({ mode: 'view', doc: existente })

    expect(nomesDosIcones()).toEqual(['common.preview', 'common.download'])
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('em visualização não há dica de formatos nem corpo vazio: não há como enviar', () => {
    const { container } = montar({ mode: 'view', doc: existente })

    expect(screen.queryByText('signature.hint')).toBeNull()
    // O cartão tem só o cabeçalho e a linha.
    expect((container.firstChild as HTMLElement).children).toHaveLength(2)
  })

  it('em criação a dica aparece com o seletor e some quando o arquivo está em stage', () => {
    const { unmount } = render(<RedatorSignatureSlot {...propsBase({ mode: 'create' })} />)
    expect(screen.getByText('signature.hint')).toBeTruthy()
    unmount()

    render(<RedatorSignatureSlot {...propsBase({ mode: 'create', staged: limpo })} />)
    expect(screen.queryByText('signature.hint')).toBeNull()
  })

  it('em visualização sem firma mostra "não carregado" e nenhum botão', () => {
    montar({ mode: 'view' })

    expect(screen.getByText('common.notLoaded')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('em criação o PNG confirmado vai para o stage e não para o upload', async () => {
    const { props, container } = montar({ mode: 'create' })
    await escolherImagem(container)

    fireEvent.click(screen.getByRole('button', { name: 'signature.confirm' }))

    expect(props.onStage).toHaveBeenCalledWith(limpo)
    expect(props.onUpload).not.toHaveBeenCalled()
  })

  it('em criação com o arquivo em stage mostra a linha, só com o tirar, e nenhum enviar', () => {
    const { props } = montar({ mode: 'create', staged: limpo })

    expect(screen.getByText('firma.png')).toBeTruthy()
    expect(nomesDosIcones()).toEqual(['common.delete'])
    expect(document.querySelector('input[type="file"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    expect(props.onUnstage).toHaveBeenCalled()
  })
})
