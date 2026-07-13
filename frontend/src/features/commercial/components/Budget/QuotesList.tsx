import { useTranslation } from 'react-i18next'
import { AppTag, AppButton, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import type { QuoteData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useUploadQuoteFile, useRemoveQuoteFile } from '../../api/useCommercialFiles'
import { FileList } from './FileList'

export function QuotesList({
  quotes, onEdit, onRemove, onApprove, onReject,
}: {
  quotes: QuoteData[]
  onEdit?: (q: QuoteData) => void
  onRemove?: (q: QuoteData) => void
  onApprove?: (q: QuoteData) => void
  onReject?: (q: QuoteData) => void
}) {
  const { t } = useTranslation()
  const courses = coursesApi.useList()
  const uploadFile = useUploadQuoteFile()
  const removeFile = useRemoveQuoteFile()
  // `message`: o upload é um único input por linha, sem campo onde pendurar o
  // 422 de "file"/"type" — o hook já resolve o fallback.
  const { message: fileError } = useMutationErrors([uploadFile.error, removeFile.error])

  const courseName = (id: number) => courses.data?.find((c) => c.id === id)?.name ?? '—'

  const handleUpload = (quoteId: number, e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    uploadFile.mutate({ quoteId, file }, { onSuccess: () => e.options.clear() })
  }

  if (quotes.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{t('budget.noQuotes')}</p>
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {fileError && (
        <p className="m-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {fileError}
        </p>
      )}
      {quotes.map((q) => (
        <div key={q.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <div className="min-w-64 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{courseName(q.course_id)}</span>
              {q.status && <AppTag value={t(`quoteStatus.${q.status}`)} severity={quoteStatusSeverity(q.status)} />}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t('quote.studentsShort', { count: q.student_count })}
              {q.planned_start_date && ` · ${q.planned_start_date}`}
              {q.planned_end_date && ` – ${q.planned_end_date}`}
            </p>
            {q.status === 'rejected' && <p className="mt-1 text-sm text-red-600">{t('quote.rejectedNote')}</p>}
          </div>

          <span className="font-semibold">{formatUf(q.value_uf)} UF</span>

          <div className="flex items-center gap-2">
            {onReject && q.status !== 'rejected' && (
              <AppButton label={t('quote.reject')} severity="danger" outlined onClick={() => onReject(q)} />
            )}
            {onApprove && q.status !== 'approved' && (
              <AppButton variant="brandLabel" label={t('quote.approve')} onClick={() => onApprove(q)} />
            )}
          </div>

          <div className="flex items-center gap-1">
            {q.status !== 'approved' && onEdit && (
              <AppButton icon="pi pi-pencil" text rounded onClick={() => onEdit(q)} />
            )}
            {q.status !== 'approved' && onRemove && (
              <AppButton icon="pi pi-trash" text rounded severity="danger" onClick={() => onRemove(q)} />
            )}
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">{t('quote.documents')}</span>
              <AppFileUpload
                chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                chooseLabel=""
                disabled={uploadFile.isPending && uploadFile.variables?.quoteId === q.id}
                uploadHandler={(e) => handleUpload(q.id!, e)}
              />
            </div>
            <FileList files={q.files ?? []} onRemove={(fileId) => removeFile.mutate({ quoteId: q.id!, fileId })} />
          </div>
        </div>
      ))}
    </div>
  )
}
