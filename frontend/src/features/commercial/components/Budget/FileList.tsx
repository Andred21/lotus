import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { FileData } from '@shared/types/generated'

const KB = 1024

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm text-slate-500">{t('budget.noDocuments')}</p>
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
          <i className="pi pi-file text-slate-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{f.original_name}</p>
            <p className="text-xs text-slate-500">
              {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}
              {' · '}
              {Math.round(f.size / KB)} KB
            </p>
          </div>
          <a href={f.download_url} target="_blank" rel="noreferrer">
            <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
          </a>
          {onRemove && (
            <AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={() => onRemove(f.id)} />
          )}
        </li>
      ))}
    </ul>
  )
}
