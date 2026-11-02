import { useTranslation } from 'react-i18next'
import { AppFileSlot } from '@shared/ui'
import type { FileUploadHandlerEvent, PreviewableFile } from '@shared/ui'
import type {
  RedatorDocumentType,
  RedatorProfileDocumentData,
} from '@shared/types/generated'
import { ProfileDocumentSlotHeader } from './ProfileDocumentSlotHeader'

export type ProfileDocumentSlotProps = {
  doc: RedatorProfileDocumentData
  uploading: boolean
  onUpload: (type: RedatorDocumentType, e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
  onPreview: (file: PreviewableFile) => void
}

/**
 * Um tipo documental em Mi perfil, sobre o `AppFileSlot`: ações só-ícone (ver,
 * baixar, substituir), sem excluir — o redator troca o documento, não o remove.
 *
 * Irmão do `RedatorDocumentSlot`, não reuso dele (spec D3): o slot admin deriva
 * o status no front porque `RedatorDocumentData` não tem `status`; este consome
 * `RedatorProfileDocumentData.status` PRONTO do backend, sem recalcular validade
 * — duas fontes de verdade que, no mesmo componente, fariam a tela mentir.
 *
 * Substituir apaga o anterior de forma irreversível; o aviso agora é a dica do
 * ícone. O nome leva o tipo porque a tela repete o verbo em vários slots e o
 * leitor de tela ouviria "Reemplazar" sem saber de quê (D-23).
 */
export function ProfileDocumentSlot({
  doc,
  uploading,
  onUpload,
  onSizeReject,
  onPreview,
}: ProfileDocumentSlotProps) {
  const { t } = useTranslation()

  // `PreviewableFile` exige nome e URL não-nulos; o DTO os traz nullable porque
  // o slot ausente é projetado igual. Montar o literal aqui é o que estreita.
  const file: (PreviewableFile & { created_at?: string | null }) | null =
    doc.original_name && doc.download_url
      ? {
          original_name: doc.original_name,
          size: doc.size ?? undefined,
          download_url: doc.download_url,
          created_at: doc.created_at,
        }
      : null

  const tipo = t(`documentType.${doc.type}`)

  return (
    <AppFileSlot
      title={<ProfileDocumentSlotHeader tipo={tipo} status={doc.status} validUntil={doc.valid_until} />}
      file={file}
      onPreview={onPreview}
      onUpload={doc.self_service ? (e) => onUpload(doc.type, e) : undefined}
      uploadLabel={t('profile.documents.sendNamed', { tipo })}
      replaceLabel={t('profile.documents.replaceNamed', { tipo })}
      uploading={uploading}
      onSizeReject={onSizeReject}
    >
      {!doc.self_service && (
        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.documents.managedByAdmin')}
        </p>
      )}
    </AppFileSlot>
  )
}
