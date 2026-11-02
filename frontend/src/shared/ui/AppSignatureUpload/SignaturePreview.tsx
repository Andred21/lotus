import { useTranslation } from 'react-i18next'
import { dangerText } from '../../styles/tokens'
import { AppButton } from '../AppButton'
import { signatureCheckerboard } from './checkerboard'
import type { SignatureCleaner } from './useSignatureCleaner'

export interface SignaturePreviewProps {
  cleaner: SignatureCleaner
  /** Recebe o PNG LIMPO. O arquivo original nunca sobe. */
  onConfirm: (file: File) => void
  /** Envio em curso: o Confirmar mostra o carregando e o Cancelar trava. */
  busy?: boolean
  disabled?: boolean
}

/**
 * O que a limpeza deixa à vista: "processando", a prévia sobre xadrez com
 * Confirmar e Cancelar em texto, ou o erro nomeado. Não renderiza nada quando
 * não há o que mostrar, então serve de corpo do `AppFileSlot` sem moldura própria.
 */
export function SignaturePreview({ cleaner, onConfirm, busy = false, disabled = false }: SignaturePreviewProps) {
  const { t } = useTranslation()
  const { preview, error, processing, reset } = cleaner

  if (!preview && !error && !processing) return null

  return (
    <div className="flex flex-col gap-3">
      {processing && (
        <p role="status" className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('signature.processing')}
        </p>
      )}
      {preview && (
        <>
          <div className="rounded-control border p-3" style={{ borderColor: 'var(--surface-border)', ...signatureCheckerboard }}>
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
            <AppButton label={t('signature.cancel')} text disabled={busy} onClick={reset} />
          </div>
        </>
      )}
      {error && <p role="alert" className="text-xs" style={{ color: dangerText }}>{error}</p>}
    </div>
  )
}
