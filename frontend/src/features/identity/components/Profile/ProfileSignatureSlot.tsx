import { useTranslation } from 'react-i18next'
import {
  AppFileSlot,
  SIGNATURE_ACCEPT,
  SIGNATURE_MAX_ORIGINAL_BYTES,
  SignaturePreview,
  useSignatureCleaner,
} from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import type { RedatorProfileDocumentData } from '@shared/types/generated'

export type ProfileSignatureSlotProps = {
  doc: RedatorProfileDocumentData
  uploading: boolean
  /** `true` = o servidor aceitou. Só nesse caso a prévia é descartada. */
  onUpload: (file: File) => Promise<boolean>
  onPreview: (file: PreviewableFile) => void
}

/**
 * A assinatura do próprio redator em Mi perfil (spec D2 do bloco 40). Fora do
 * caminho de compliance: sem tag de status e sem validade — o `status` do DTO
 * descreve validade, que a assinatura não tem. Sem excluir: o redator troca a
 * assinatura, não a remove. Mesmo slot do admin, sobre o `AppFileSlot`.
 */
export function ProfileSignatureSlot({ doc, uploading, onUpload, onPreview }: ProfileSignatureSlotProps) {
  const { t } = useTranslation()
  const cleaner = useSignatureCleaner()

  // Sem nada a mostrar não há corpo: o slot não abre um vão vazio abaixo da linha.
  const showing = cleaner.processing || cleaner.preview !== null || cleaner.error !== null

  const file: (PreviewableFile & { created_at?: string | null }) | null =
    doc.original_name && doc.download_url
      ? {
          original_name: doc.original_name,
          size: doc.size ?? undefined,
          download_url: doc.download_url,
          created_at: doc.created_at,
        }
      : null

  return (
    <AppFileSlot
      title={t(`documentType.${doc.type}`)}
      file={file}
      onPreview={onPreview}
      onUpload={doc.self_service ? cleaner.pick : undefined}
      uploadLabel={t('profile.documents.sendSignature')}
      replaceLabel={t('profile.documents.replaceSignature')}
      accept={SIGNATURE_ACCEPT}
      maxBytes={SIGNATURE_MAX_ORIGINAL_BYTES}
      uploading={uploading || cleaner.processing}
      onSizeReject={cleaner.reject}
    >
      {doc.self_service ? (
        showing && <SignaturePreview
          cleaner={cleaner}
          busy={uploading}
          disabled={uploading}
          onConfirm={(png) => void onUpload(png).then((ok) => ok && cleaner.reset())}
        />
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.documents.managedByAdmin')}
        </p>
      )}
    </AppFileSlot>
  )
}
