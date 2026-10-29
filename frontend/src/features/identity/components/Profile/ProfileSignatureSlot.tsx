import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppFileActions, AppFileRow, AppSignatureUpload } from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import type { RedatorProfileDocumentData } from '@shared/types/generated'

export type ProfileSignatureSlotProps = {
  doc: RedatorProfileDocumentData
  uploading: boolean
  /** `true` = o servidor aceitou. Só nesse caso o seletor é remontado. */
  onUpload: (file: File) => Promise<boolean>
  onPreview: (file: PreviewableFile) => void
}

/**
 * A assinatura do próprio redator em Mi perfil (spec D2 do bloco 40). Fora do
 * caminho de compliance: sem tag de status e sem validade — o `status` do DTO
 * descreve validade, que a assinatura não tem.
 */
export function ProfileSignatureSlot({ doc, uploading, onUpload, onPreview }: ProfileSignatureSlotProps) {
  const { t } = useTranslation()
  // O `AppSignatureUpload` não se reseta depois do `onConfirm`; trocar a `key` o
  // remonta e some com a prévia que ficaria a um clique de reenviar.
  const [uploadKey, setUploadKey] = useState(0)

  const file: PreviewableFile | null =
    doc.original_name && doc.download_url
      ? { original_name: doc.original_name, size: doc.size ?? undefined, download_url: doc.download_url }
      : null

  return (
    <div className="rounded-surface border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <p className="text-sm font-medium">{t(`documentType.${doc.type}`)}</p>

      <div className="mt-2 flex flex-col gap-3">
        {file ? (
          <AppFileRow
            name={file.original_name}
            size={file.size}
            createdAt={doc.created_at}
            actions={<AppFileActions file={file} onPreview={onPreview} />}
          />
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{t('common.notLoaded')}</p>
        )}

        {doc.self_service ? (
          <AppSignatureUpload
            key={uploadKey}
            label={t(file ? 'profile.documents.replaceSignature' : 'profile.documents.sendSignature')}
            busy={uploading}
            disabled={uploading}
            onConfirm={(png) => void onUpload(png).then((ok) => ok && setUploadKey((k) => k + 1))}
          />
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {t('profile.documents.managedByAdmin')}
          </p>
        )}
      </div>
    </div>
  )
}
