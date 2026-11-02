import { useTranslation } from 'react-i18next'
import { AppSignatureSlot } from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { profileFile } from '../../lib/profileFile'

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
 * assinatura, não a remove. Mesmo slot do admin, o `AppSignatureSlot`.
 */
export function ProfileSignatureSlot({ doc, uploading, onUpload, onPreview }: ProfileSignatureSlotProps) {
  const { t } = useTranslation()

  return (
    <AppSignatureSlot
      title={t(`documentType.${doc.type}`)}
      file={profileFile(doc)}
      onPreview={onPreview}
      onConfirm={doc.self_service ? onUpload : undefined}
      uploadLabel={t('profile.documents.sendSignature')}
      replaceLabel={t('profile.documents.replaceSignature')}
      uploading={uploading}
    >
      {!doc.self_service && (
        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.documents.managedByAdmin')}
        </p>
      )}
    </AppSignatureSlot>
  )
}
