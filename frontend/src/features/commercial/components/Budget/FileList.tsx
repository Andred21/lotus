import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppFileRow, AppFilePreviewDialog } from '@shared/ui'
import type { FileData } from '@shared/types/generated'

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<FileData | null>(null)

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noDocuments')}</p>
  }

  return (
    <>
      <ul>
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
                <>
                  <AppButton
                    icon="pi pi-eye"
                    text
                    rounded
                    aria-label={t('common.preview')}
                    onClick={() => setPreview(f)}
                  />
                  <a href={f.download_url} target="_blank" rel="noreferrer">
                    <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
                  </a>
                  {onRemove && (
                    <AppButton
                      icon="pi pi-trash"
                      text
                      rounded
                      severity="danger"
                      aria-label={t('common.delete')}
                      onClick={() => onRemove(f.id)}
                    />
                  )}
                </>
              }
            />
          </li>
        ))}
      </ul>

      <AppFilePreviewDialog file={preview} visible={preview !== null} onHide={() => setPreview(null)} />
    </>
  )
}
