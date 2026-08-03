import { useTranslation } from 'react-i18next'
import { AppTag, AppButton, AppFileUpload, FormErrorBanner } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useQuoteFiles } from '../../hooks/useQuoteFiles'
import { useQuotesListCourses } from '../../hooks/useQuotesListCourses'
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
  const { courseName } = useQuotesListCourses()
  const files = useQuoteFiles()

  if (quotes.length === 0) {
    return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noQuotes')}</p>
  }

  return (
    <div>
      <div className="m-4 empty:m-0">
        <FormErrorBanner message={files.fileError} />
        {files.sizeError && <FormErrorBanner message={files.sizeError} />}
      </div>
      {/* Contêiner próprio: `first:border-t-0` mira o primeiro filho DESTA div,
       * não o primeiro filho do wrapper de cima (que sempre existe por causa do
       * banner de erro, mesmo vazio). */}
      <div>
        {quotes.map((q, i) => (
          <div
            key={q.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 first:border-t-0"
            style={{
              borderColor: 'var(--surface-border)',
              // Alternância como separação de item (spec D4): lista empilhada, não tabela.
              background: i % 2 === 1 ? 'var(--surface-section)' : 'transparent',
            }}
          >
            <div className="min-w-64 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{courseName(q.course_id)}</span>
                {q.status && <AppTag value={t(`quoteStatus.${q.status}`)} severity={quoteStatusSeverity(q.status)} />}
              </div>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t('quote.studentsShort', { count: q.student_count })}
                {q.planned_start_date && ` · ${q.planned_start_date}`}
                {q.planned_end_date && ` – ${q.planned_end_date}`}
              </p>
              {q.status === 'rejected' && (
                <p className="mt-1 text-sm" style={{ color: 'var(--red-500)' }}>{t('quote.rejectedNote')}</p>
              )}
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
                <AppButton icon="pi pi-pencil" text rounded aria-label={t('common.edit')} onClick={() => onEdit(q)} />
              )}
              {q.status !== 'approved' && onRemove && (
                <AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={() => onRemove(q)} />
              )}
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-color-secondary)' }}>
                  {t('quote.documents')}
                </span>
                <AppFileUpload
                  chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                  chooseLabel=""
                  // aria-label no span clicável do modo básico via passthrough tipado:
                  // o FileUpload do Prime descarta chaves desconhecidas de chooseOptions.
                  pt={{ basicButton: { 'aria-label': t('common.upload') } }}
                  disabled={files.isUploading(q.id!)}
                  onSizeReject={files.setSizeError}
                  uploadHandler={(e) => files.upload(q.id!, e)}
                />
              </div>
              <FileList files={q.files ?? []} onRemove={(fileId) => files.remove(q.id!, fileId)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
