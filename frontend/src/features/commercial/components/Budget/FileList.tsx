import { useTranslation } from 'react-i18next'
import { AppFileRow, AppFileActions, AppFilePreviewDialog } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { FileData } from '@shared/types/generated'

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()
  const preview = useFilePreview<FileData>()

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noDocuments')}</p>
  }

  return (
    <>
      <ul role="list">
        {files.map((f) => (
          <li
            key={f.id}
            className="border-t px-4 py-3 first:border-t-0"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <AppFileRow
              name={f.original_name}
              mime={f.mime}
              size={f.size}
              createdAt={f.created_at}
              actions={
                <AppFileActions
                  file={f}
                  onPreview={preview.open}
                  onRemove={onRemove ? () => onRemove(f.id) : undefined}
                />
              }
            />
          </li>
        ))}
      </ul>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </>
  )
}
