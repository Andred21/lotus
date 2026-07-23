import { useTranslation } from 'react-i18next'
import { AppButton, AppFileUpload, AppTag } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import { formatFileSize } from '../../lib/turmaDocuments'

type Props = {
  type: TurmaDocumentType
  files: TurmaDocumentData[]
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: (file: TurmaDocumentData) => void
  removing: boolean
  canSubmit: boolean
}

export function DocumentTypeCard({
  type,
  files,
  uploading,
  onUpload,
  onRemove,
  removing,
  canSubmit,
}: Props) {
  const { t } = useTranslation()
  const delivered = files.length > 0

  return (
    <section className="rounded border border-slate-200 p-4 dark:border-slate-700">
      <header className="flex items-center justify-between gap-4">
        <h4 className="font-medium">{t(`operation.documents.type.${type}`)}</h4>
        <AppTag
          value={t(delivered ? 'operation.documents.delivered' : 'operation.documents.pending')}
          severity={delivered ? 'success' : 'warning'}
        />
        {canSubmit && (
          <AppFileUpload
            accept="application/pdf"
            chooseLabel={t('operation.documents.upload')}
            disabled={uploading}
            uploadHandler={(e: FileUploadHandlerEvent) => {
              const file = e.files[0]
              if (file) onUpload(file)
            }}
          />
        )}
      </header>

      <ul className="mt-3 space-y-1">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <i className="pi pi-file-pdf" aria-hidden="true" />
            <span>{file.original_name}</span>
            <span className="text-slate-400">
              {formatFileSize(file.size)} · {formatDate(new Date(file.created_at))}
            </span>
            {canSubmit && (
              <AppButton
                icon="pi pi-trash"
                text
                severity="danger"
                aria-label={t('operation.documents.remove')}
                disabled={removing}
                onClick={() => onRemove(file)}
              />
            )}
          </li>
        ))}
        {!delivered && <li className="text-sm text-slate-400">{t('operation.documents.empty')}</li>}
      </ul>
      {canSubmit && <p className="mt-2 text-xs text-slate-400">{t('operation.documents.uploadHint')}</p>}
    </section>
  )
}
