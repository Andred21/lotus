import { useTranslation } from 'react-i18next'
import { AppCard, AppFilePreviewDialog, FormErrorBanner, FormSection, useToast } from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { COMPLIANCE_DOC_TYPES } from '@shared/lib'
import { useProfileDocuments } from '../../hooks/useProfileDocuments'
import { ProfileDocumentSlot } from './ProfileDocumentSlot'
import { ProfileSignatureSlot } from './ProfileSignatureSlot'

/**
 * Os slots documentais do Redator. O backend projeta SEMPRE todos os tipos,
 * ausentes inclusive — a tela não decide quais existem, só como cada um se
 * desenha: os quatro de compliance têm status e validade; a `FIRMA`, não, e
 * ganha o slot próprio, depois deles.
 */
export function ProfileDocumentsSection({
  documentos,
}: {
  documentos: RedatorProfileDocumentData[]
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const preview = useFilePreview<PreviewableFile>()
  const { upload, uploadFile, uploadingTypes, error, setSizeError } = useProfileDocuments(() =>
    toast.success(t('profile.documents.sent')),
  )

  const compliance = documentos.filter((d) => (COMPLIANCE_DOC_TYPES as readonly string[]).includes(d.type))
  const firma = documentos.find((d) => d.type === 'FIRMA')

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.documents.title')} as="h2" />

      <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('profile.documents.hint')}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <FormErrorBanner message={error} />

        {compliance.map((doc) => (
          <ProfileDocumentSlot
            key={doc.type}
            doc={doc}
            uploading={uploadingTypes.includes(doc.type)}
            onUpload={upload}
            onSizeReject={setSizeError}
            onPreview={preview.open}
          />
        ))}

        {firma && (
          <ProfileSignatureSlot
            doc={firma}
            uploading={uploadingTypes.includes('FIRMA')}
            onUpload={(file) => uploadFile('FIRMA', file)}
            onPreview={preview.open}
          />
        )}
      </div>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </AppCard>
  )
}
