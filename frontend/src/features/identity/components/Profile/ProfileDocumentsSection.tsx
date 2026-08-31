import { useTranslation } from 'react-i18next'
import { AppCard, AppFilePreviewDialog, FormErrorBanner, FormSection, useToast } from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { useProfileDocuments } from '../../hooks/useProfileDocuments'
import { ProfileDocumentSlot } from './ProfileDocumentSlot'

/**
 * Os quatro slots documentais do Redator. O backend projeta SEMPRE os quatro
 * tipos, ausentes inclusive — a tela não decide quais existem.
 */
export function ProfileDocumentsSection({
  documentos,
}: {
  documentos: RedatorProfileDocumentData[]
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const preview = useFilePreview<PreviewableFile>()
  const { upload, uploadingTypes, error, setSizeError } = useProfileDocuments(() =>
    toast.success(t('profile.documents.sent')),
  )

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.documents.title')} as="h2" />

      <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('profile.documents.hint')}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <FormErrorBanner message={error} />

        {documentos.map((doc) => (
          <ProfileDocumentSlot
            key={doc.type}
            doc={doc}
            uploading={uploadingTypes.includes(doc.type)}
            onUpload={upload}
            onSizeReject={setSizeError}
            onPreview={preview.open}
          />
        ))}
      </div>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </AppCard>
  )
}
