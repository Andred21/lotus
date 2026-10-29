import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  cleanSignature,
  EmptySignatureError,
  fileToRaster,
  rasterToPngFile,
  SIGNATURE_MAX_BYTES,
  SIGNATURE_MIN_WIDTH,
  UnsupportedImageError,
} from '@shared/lib/signature'
import { dangerText } from '../../styles/tokens'
import { AppButton } from '../AppButton'
import { AppFileUpload } from '../AppFileUpload'
import type { FileUploadHandlerEvent } from '../AppFileUpload'

export interface AppSignatureUploadProps {
  /** Rótulo do botão de escolher a imagem, já traduzido. */
  label: string
  /** Recebe o PNG LIMPO. O arquivo original nunca sobe. */
  onConfirm: (file: File) => void
  disabled?: boolean
  /** Envio em curso: trava a decisão enquanto o chamador salva. */
  busy?: boolean
}

interface Preview {
  file: File
  url: string
}

// A foto de celular crua passa fácil dos 10 MB dos documentos; o que sobe é o
// PNG limpo (teto próprio, `SIGNATURE_MAX_BYTES`), então o original tem folga.
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024

// Xadrez com as cores do tema: é o que deixa o fundo transparente ENXERGÁVEL.
const CHECKERBOARD = {
  backgroundImage: 'repeating-conic-gradient(var(--surface-border) 0% 25%, var(--surface-card) 0% 50%)',
  backgroundSize: '16px 16px',
}

/**
 * Escolha de assinatura com limpeza no navegador (spec D16 do bloco 40): escolhe,
 * limpa (recorte, fundo transparente, 1600 px no máximo), mostra o resultado
 * sobre xadrez e só então entrega o PNG a `onConfirm`. A lógica de pixel mora em
 * `shared/lib/signature`; aqui é só o fluxo.
 */
export function AppSignatureUpload({ label, onConfirm, disabled = false, busy = false }: AppSignatureUploadProps) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const url = preview?.url
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [preview])

  const message = (e: unknown): string => {
    if (e instanceof UnsupportedImageError) return t('signature.errorUnsupported')
    if (e instanceof EmptySignatureError) return t('signature.errorEmpty')
    return t('signature.errorGeneric')
  }

  const process = async (original: File) => {
    setError(null)
    setPreview(null)
    setProcessing(true)
    try {
      const cleaned = cleanSignature(await fileToRaster(original))
      if (cleaned.width < SIGNATURE_MIN_WIDTH) {
        setError(t('signature.errorTooNarrow', { width: cleaned.width, min: SIGNATURE_MIN_WIDTH }))
        return
      }
      const file = await rasterToPngFile(cleaned, 'firma.png')
      if (file.size > SIGNATURE_MAX_BYTES) return setError(t('signature.errorTooHeavy'))
      setPreview({ file, url: URL.createObjectURL(file) })
    } catch (e) {
      setError(message(e))
    } finally {
      setProcessing(false)
    }
  }

  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    e.options.clear()
    if (file) void process(file)
  }

  return (
    <div className="flex flex-col gap-3">
      {preview ? (
        <>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--surface-border)', ...CHECKERBOARD }}>
            <img src={preview.url} alt={t('signature.previewAlt')} className="mx-auto max-h-32 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton
              label={t('signature.confirm')}
              icon="pi pi-check"
              loading={busy}
              disabled={disabled}
              onClick={() => onConfirm(preview.file)}
            />
            <AppButton label={t('signature.cancel')} text disabled={busy} onClick={() => setPreview(null)} />
          </div>
        </>
      ) : (
        <>
          <div>
            <AppFileUpload
              accept="image/png,image/jpeg,image/webp"
              maxBytes={MAX_ORIGINAL_BYTES}
              disabled={disabled || processing}
              chooseLabel={label}
              chooseOptions={{ icon: 'pi pi-upload' }}
              uploadHandler={handleUpload}
              onSizeReject={setError}
            />
          </div>
          <p role={processing ? 'status' : undefined} className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {processing ? t('signature.processing') : t('signature.hint')}
          </p>
        </>
      )}
      {error && <p role="alert" className="text-xs" style={{ color: dangerText }}>{error}</p>}
    </div>
  )
}
