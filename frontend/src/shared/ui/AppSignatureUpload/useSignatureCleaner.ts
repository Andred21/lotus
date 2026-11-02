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
import type { FileUploadHandlerEvent } from '../AppFileUpload'

/** Formatos que o seletor aceita. O que sobe é sempre PNG, já limpo. */
export const SIGNATURE_ACCEPT = 'image/png,image/jpeg,image/webp'

/** A foto de celular crua passa fácil dos 10 MB dos documentos; o que sobe é o
 * PNG limpo (teto próprio, `SIGNATURE_MAX_BYTES`), então o original tem folga. */
export const SIGNATURE_MAX_ORIGINAL_BYTES = 25 * 1024 * 1024

export interface SignaturePreviewState {
  file: File
  url: string
}

export interface SignatureCleaner {
  /** Entrega o arquivo escolhido à limpeza. Serve de `onUpload` do `AppFileSlot`. */
  pick: (e: FileUploadHandlerEvent) => void
  /** O PNG limpo, à espera da decisão. */
  preview: SignaturePreviewState | null
  error: string | null
  processing: boolean
  /** Descarta a prévia e o erro (cancelar, ou envio aceito). */
  reset: () => void
  /** Mostra um erro que nasceu fora da limpeza (arquivo acima do teto do original). */
  reject: (message: string) => void
}

/**
 * Limpeza de assinatura no navegador (spec D16 do bloco 40): escolhe, limpa
 * (recorte, fundo transparente, 1600 px no máximo) e guarda o PNG para o
 * chamador confirmar. A lógica de pixel mora em `shared/lib/signature`; aqui é
 * só o fluxo. A decisão (Confirmar/Cancelar) é do `SignaturePreview`.
 */
export function useSignatureCleaner(): SignatureCleaner {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<SignaturePreviewState | null>(null)
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

  const pick = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    e.options.clear()
    if (file) void process(file)
  }

  const reset = () => {
    setPreview(null)
    setError(null)
  }

  return { pick, preview, error, processing, reset, reject: setError }
}
