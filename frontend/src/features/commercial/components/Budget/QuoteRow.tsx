import { useTranslation } from 'react-i18next'
import { AppTag, AppButton, AppFileSlot, AppFilePreviewDialog, type FileUploadHandlerEvent } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { FileData, QuoteData } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '@shared/lib'
import { dangerText } from '@shared/styles/tokens'
import { turmaTag, turmaTagSeverity } from '../../lib/turmaTag'
import { latestFile } from '../../lib/latestFile'

/** Uma cotação da lista do orçamento. `striped` vem do índice: alternância como
 * separação de item (spec D4) — lista empilhada, não tabela. */
export function QuoteRow({
  quote, striped, courseName, uploading, canManageApproved,
  onEdit, onRemove, onApprove, onReject,
  onUpload, onRemoveFile, onSizeReject,
}: {
  quote: QuoteData
  striped: boolean
  courseName: string
  uploading: boolean
  /** Quem tem `commercial.quote.approve` edita a cotação aprovada (spec D2/D8);
   * o backend é a fonte da regra, a UI só não oferece o que daria 422. */
  canManageApproved: boolean
  onEdit?: () => void
  onRemove?: () => void
  onApprove?: () => void
  onReject?: () => void
  onUpload: (e: FileUploadHandlerEvent) => void
  onRemoveFile: (fileId: number) => void
  onSizeReject: (message: string) => void
}) {
  const { t } = useTranslation()
  const preview = useFilePreview<FileData>()
  const turma = turmaTag(quote)
  const current = latestFile(quote.files ?? [])
  // O nome das ações do arquivo diz que o alvo é o DOCUMENTO; o curso só
  // distingue a linha. Só o curso fazia o excluir do arquivo soar como o da
  // cotação (Q-4 da revisão do bloco 47).
  const documento = t('quote.documentOf', { curso: courseName })

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 first:border-t-0"
      style={{
        borderColor: 'var(--surface-border)',
        background: striped ? 'var(--surface-section)' : 'transparent',
      }}
    >
      <div className="min-w-64 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{courseName}</span>
          {quote.status && (
            <AppTag value={t(`quoteStatus.${quote.status}`)} severity={quoteStatusSeverity(quote.status)} />
          )}
          {turma && <AppTag value={t(`quote.turmaTag.${turma}`)} severity={turmaTagSeverity(turma)} />}
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
        {onReject && quote.status !== 'rejected' && !quote.turma_status && (
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
        {(quote.status !== 'approved' || canManageApproved) && onEdit && (
          <AppButton icon="pi pi-pencil" text rounded aria-label={t('common.edit')} onClick={onEdit} />
        )}
        {quote.status !== 'approved' && onRemove && (
          <AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={onRemove} />
        )}
      </div>

      <div className="w-full">
        <AppFileSlot
          title={t('quote.documents')}
          file={current}
          onPreview={preview.open}
          onUpload={onUpload}
          uploadLabel={t('common.uploadNamed', { tipo: documento })}
          replaceLabel={t('common.replaceNamed', { tipo: documento })}
          removeLabel={t('common.deleteNamed', { tipo: documento })}
          uploading={uploading}
          onSizeReject={onSizeReject}
          onRemove={current ? () => onRemoveFile(current.id) : undefined}
        />
        <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
      </div>
    </div>
  )
}
