import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { UnsupportedImageError } from '@shared/lib/signature'
import type { Raster } from '@shared/lib/signature'
import { fileToRaster, rasterToPngFile } from '@shared/lib/signature/canvasBridge'
import { signatureCheckerboard } from './checkerboard'
import { SignaturePreview } from './SignaturePreview'
import { useSignatureCleaner } from './useSignatureCleaner'
import type { SignatureCleaner } from './useSignatureCleaner'

vi.mock('@shared/lib/signature/canvasBridge', () => ({
  fileToRaster: vi.fn(),
  rasterToPngFile: vi.fn(),
}))

/** Raster com um traco de `traco` px de largura num papel de 1000 px. */
function raster(traco: number): Raster {
  const width = 1000
  const height = 100
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 40; y < 60; y++) {
    for (let x = 100; x < 100 + traco; x++) data.set([0, 0, 0, 255], (y * width + x) * 4)
  }
  return { width, height, data }
}

const limpo = new File(['png'], 'firma.png', { type: 'image/png' })

/** Escolhe a foto pelo hook, como o slot faz, e devolve o resultado do hook. */
function escolher() {
  const hook = renderHook(() => useSignatureCleaner())
  const original = new File(['jpg'], 'foto.jpg', { type: 'image/jpeg' })
  act(() => hook.result.current.pick({ files: [original], options: { clear: vi.fn() } } as never))
  return hook.result
}

describe('useSignatureCleaner — a limpeza antes do envio', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(rasterToPngFile).mockResolvedValue(limpo)
  })
  afterEach(() => vi.clearAllMocks())

  it('a prévia entrega o arquivo LIMPO, não o original', async () => {
    vi.mocked(fileToRaster).mockResolvedValue(raster(700))
    const result = escolher()

    await waitFor(() => expect(result.current.preview).not.toBeNull())

    expect(result.current.preview?.file).toBe(limpo)
  })

  // Q-1 do review do bloco 40: o preview mora dentro do <form> do chamador, e
  // Confirmar ou Cancelar enviavam esse form junto (botão sem `type`).
  it.each(['signature.cancel', 'signature.confirm'])('dentro de um form, %s não envia o form do chamador', (botao) => {
    const enviar = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const cleaner: SignatureCleaner = {
      pick: vi.fn(), preview: { file: limpo, url: 'blob:previa' }, error: null, processing: false, reset: vi.fn(), reject: vi.fn(),
    }
    render(<form onSubmit={enviar}><SignaturePreview cleaner={cleaner} onConfirm={vi.fn()} /></form>)

    fireEvent.click(screen.getByRole('button', { name: botao }))

    expect(enviar).not.toHaveBeenCalled()
  })

  it('cancelar a prévia a descarta sem entregar o arquivo', async () => {
    vi.mocked(fileToRaster).mockResolvedValue(raster(700))
    const onConfirm = vi.fn()
    function Harness() {
      const cleaner = useSignatureCleaner()
      return (
        <>
          <button type="button" onClick={() => cleaner.pick({ files: [new File(['jpg'], 'foto.jpg')], options: { clear: vi.fn() } } as never)}>
            escolher
          </button>
          <SignaturePreview cleaner={cleaner} onConfirm={onConfirm} />
        </>
      )
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'escolher' }))
    await screen.findByRole('img', { name: 'signature.previewAlt' })

    fireEvent.click(screen.getByRole('button', { name: 'signature.cancel' }))

    await waitFor(() => expect(screen.queryByRole('img', { name: 'signature.previewAlt' })).toBeNull())
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('formato que o navegador não lê guarda a mensagem nomeada, sem prévia', async () => {
    vi.mocked(fileToRaster).mockRejectedValue(new UnsupportedImageError())
    const result = escolher()

    await waitFor(() => expect(result.current.error).toBe('signature.errorUnsupported'))
    expect(result.current.preview).toBeNull()
  })

  it('imagem sem traço guarda a mensagem nomeada', async () => {
    vi.mocked(fileToRaster).mockResolvedValue({ width: 10, height: 10, data: new Uint8ClampedArray(400).fill(255) })
    const result = escolher()

    await waitFor(() => expect(result.current.error).toBe('signature.errorEmpty'))
  })

  it('largura final abaixo do mínimo do servidor é recusada, sem prévia', async () => {
    vi.mocked(fileToRaster).mockResolvedValue(raster(300))
    const result = escolher()

    await waitFor(() => expect(result.current.error).toBe('signature.errorTooNarrow'))
    expect(rasterToPngFile).not.toHaveBeenCalled()
  })

  it('PNG limpo acima de 1 MB é recusado antes de subir', async () => {
    vi.mocked(fileToRaster).mockResolvedValue(raster(700))
    vi.mocked(rasterToPngFile).mockResolvedValue(new File([new Uint8Array(1024 * 1024 + 1)], 'x.png'))
    const result = escolher()

    await waitFor(() => expect(result.current.error).toBe('signature.errorTooHeavy'))
  })

  it('o xadrez lê os tokens da assinatura, não as superfícies do tema', () => {
    expect(signatureCheckerboard.backgroundImage).toContain('var(--signature-bg-a)')
    expect(signatureCheckerboard.backgroundImage).toContain('var(--signature-bg-b)')
    expect(signatureCheckerboard.backgroundImage).not.toContain('--surface-card')
  })
})

describe('useSignatureCleaner e SignaturePreview', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(rasterToPngFile).mockResolvedValue(limpo)
  })
  afterEach(() => vi.clearAllMocks())

  const ocioso: SignatureCleaner = {
    pick: vi.fn(), preview: null, error: null, processing: false, reset: vi.fn(), reject: vi.fn(),
  }

  it('o erro de tamanho do original aparece e o reset o apaga', () => {
    const { result } = renderHook(() => useSignatureCleaner())

    act(() => result.current.reject('arquivo grande demais'))
    expect(result.current.error).toBe('arquivo grande demais')

    act(() => result.current.reset())
    expect(result.current.error).toBeNull()
  })

  it('reset depois da escolha descarta a prévia e solta a URL do blob', async () => {
    vi.mocked(fileToRaster).mockResolvedValue(raster(700))
    const { result } = renderHook(() => useSignatureCleaner())
    const original = new File(['jpg'], 'foto.jpg', { type: 'image/jpeg' })

    act(() => result.current.pick({ files: [original], options: { clear: vi.fn() } } as never))
    await waitFor(() => expect(result.current.preview).not.toBeNull())
    act(() => result.current.reset())

    expect(result.current.preview).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa')
  })

  it('a prévia ociosa não renderiza nada', () => {
    const { container } = render(<SignaturePreview cleaner={ocioso} onConfirm={vi.fn()} />)

    expect(container.firstChild).toBeNull()
  })

  it('processando mostra o aviso de estado e nenhum botão de decisão', () => {
    render(<SignaturePreview cleaner={{ ...ocioso, processing: true }} onConfirm={vi.fn()} />)

    expect(screen.getByRole('status').textContent).toBe('signature.processing')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('com envio em curso o Confirmar carrega e o Cancelar trava', () => {
    const preview = { file: limpo, url: 'blob:previa' }
    render(<SignaturePreview cleaner={{ ...ocioso, preview }} onConfirm={vi.fn()} busy />)

    expect((screen.getByRole('button', { name: 'signature.cancel' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'signature.confirm' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
