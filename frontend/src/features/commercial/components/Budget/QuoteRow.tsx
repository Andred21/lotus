import { useTranslation } from 'react-i18next'
import { AppTag, AppButton, AppFileUpload, type FileUploadHandlerEvent } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '@shared/lib'
import { dangerText } from '@shared/styles/tokens'
import { FileList } from './FileList'

/** Uma cotação da lista do orçamento. `striped` vem do índice: alternância como
 * separação de item (spec D4) — lista empilhada, não tabela. */
export function QuoteRow({
  quote, striped, courseName, uploading,
  onEdit, onRemove, onApprove, onReject,
  onUpload, onRemoveFile, onSizeReject,
}: {
  quote: QuoteData
  striped: boolean
  courseName: string
  uploading: boolean
  onEdit?: () => void
  onRemove?: () => void
  onApprove?: () => void
  onReject?: () => void
  onUpload: (e: FileUploadHandlerEvent) => void
  onRemoveFile: (fileId: number) => void
  onSizeReject: (message: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 first:border-t-0"
      style={{
        borderColor: 'var(--surface-border)',
        background: striped ? 'var(--surface-section)' : 'transparent',
      }}
    >
      <div className="min-w-64 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{courseName}</span>
          {quote.status && (
            <AppTag value={t(`quoteStatus.${quote.status}`)} severity={quoteStatusSeverity(quote.status)} />
          )}
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('quote.studentsShort', { count: quote.student_count })}
          {quote.planned_start_date && ` · ${quote.planned_start_date}`}
          {quote.planned_end_date && ` – ${quote.planned_end_date}`}
        </p>
        {/* `dangerText`, não `--red-500` cru: o hue puro mede 3,52:1 em 14px
          * sobre o card, abaixo do 4,5:1 de texto normal. É o caso que o
          * docblock de `tokens.ts` prevê — a catraca de cor do eslint só
          * enxerga `className`, então cor errada entrando por `style` passa
          * verde. */}
        {quote.status === 'rejected' && (
          <p className="mt-1 text-sm" style={{ color: dangerText }}>{t('quote.rejectedNote')}</p>
        )}
      </div>

      <span className="font-semibold">{formatUf(quote.value_uf)} UF</span>

      <div className="flex items-center gap-2">
        {onReject && quote.status !== 'rejected' && (
          /* `px-3 py-2.5 text-sm`: a geometria do `compact` que o Aprobar ao
           * lado usa, 44px/14px, escrita aqui porque o `compact` também pinta a
           * superfície da marca — e esta é a recusa. Com a geometria cheia do
           * tema o destrutivo saía 2px mais alto, 32px mais largo e dois pontos
           * maior que o construtivo (f1 UI-02, run de 2026-08-28); com o
           * `size="small"` do Prime sobrava o degrau inverso, 40 contra 44 (run
           * 5 de 2026-08-30). O `border-2` fecha os 2px que faltavam: o
           * `compact` do Aprobar traz borda de 2px pela camada de marca, e o
           * `outlined` do Prime desenha 1px. O `severity` segue sendo o sinal do
           * destrutivo. */
          <AppButton
            label={t('quote.reject')}
            severity="danger"
            outlined
            className="border-2 px-3 py-2.5 text-sm"
            onClick={onReject}
          />
        )}
        {onApprove && quote.status !== 'approved' && (
          <AppButton variant="compact" label={t('quote.approve')} onClick={onApprove} />
        )}
      </div>

      <div className="flex items-center gap-1">
        {quote.status !== 'approved' && onEdit && (
          <AppButton icon="pi pi-pencil" text rounded aria-label={t('common.edit')} onClick={onEdit} />
        )}
        {quote.status !== 'approved' && onRemove && (
          <AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={onRemove} />
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
            disabled={uploading}
            onSizeReject={onSizeReject}
            uploadHandler={onUpload}
          />
        </div>
        <FileList files={quote.files ?? []} onRemove={onRemoveFile} />
      </div>
    </div>
  )
}
