import { useTranslation } from 'react-i18next'
import { FormErrorBanner, InlineLoadState } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { useQuoteFiles } from '../../hooks/useQuoteFiles'
import { useQuotesListCourses } from '../../hooks/useQuotesListCourses'
import { QuoteRow } from './QuoteRow'

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
  const courses = useQuotesListCourses()
  const files = useQuoteFiles()

  const nameLost = courses.isError && quotes.some((q) => !courses.hasCourse(q.course_id))

  if (quotes.length === 0) {
    return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noQuotes')}</p>
  }

  return (
    <div>
      <div className="m-4 empty:m-0">
        <FormErrorBanner message={files.fileError} />
        {files.sizeError && <FormErrorBanner message={files.sizeError} />}
        {/* Falha do GET de cursos NÃO esconde as cotações (D2): o que ela explica
         * é o `—` no lugar do nome. Erro de mutação de arquivo é outra categoria
         * e continua nos banners acima.
         *
         * O aviso só sai quando a falha CUSTOU algum nome: com o cache resolvendo
         * todos os ids, gatear por `isError` cru anunciava uma falha que ninguém
         * consegue ver na tela — a tese do bloco, invertida (review do BD-6, Q-1b). */}
        <InlineLoadState
          error={nameLost ? (courses.errorDetail ?? t('common.loadErrorHint')) : null}
          retryLabel={t('common.retry')}
          onRetry={courses.refetch}
        />
      </div>
      {/* Contêiner próprio: `first:border-t-0` mira o primeiro filho DESTA div,
       * não o primeiro filho do wrapper de cima (que sempre existe por causa do
       * banner de erro, mesmo vazio). */}
      <div>
        {quotes.map((q, i) => (
          <QuoteRow
            key={q.id}
            quote={q}
            striped={i % 2 === 1}
            courseName={courses.courseName(q.course_id)}
            uploading={files.isUploading(q.id!)}
            onEdit={onEdit ? () => onEdit(q) : undefined}
            onRemove={onRemove ? () => onRemove(q) : undefined}
            onApprove={onApprove ? () => onApprove(q) : undefined}
            onReject={onReject ? () => onReject(q) : undefined}
            onUpload={(e) => files.upload(q.id!, e)}
            onRemoveFile={(fileId) => files.remove(q.id!, fileId)}
            onSizeReject={files.setSizeError}
          />
        ))}
      </div>
    </div>
  )
}
