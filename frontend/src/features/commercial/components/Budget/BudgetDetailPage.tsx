import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { AppButton, AppTag, ConfirmDialog, DetailHeader, AppCard, AppCardHeader, AppDetailSkeleton, AppErrorState } from '@shared/ui'
import type { AppCardTone } from '@shared/ui'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { QuotesList } from './QuotesList'
import { BudgetDialog } from './BudgetDialog'
import { QuoteWizard } from './QuoteWizard'
import { BudgetDocumentsCard } from './BudgetDocumentsCard'

export function BudgetDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const budgetId = Number(id)
  const d = useBudgetDetail(budgetId)

  // Erro e notFound mantêm o `back`: sem ele um GET que falha e continua falhando
  // prende o usuário na rota — Reintentar recarrega, não sai.
  const back = { label: t('budget.back'), onClick: d.goBack }

  if (d.loading) return <AppDetailSkeleton />
  if (d.loadError)
    return (
      <div>
        <DetailHeader back={back} />
        <AppErrorState
          title={t('common.loadError')}
          detail={d.loadError.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={d.reload}
        />
      </div>
    )
  if (!d.budget)
    return (
      <div>
        <DetailHeader back={back} />
        <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.notFound')}</p>
      </div>
    )

  const budget = d.budget

  return (
    <div>
      <DetailHeader
        back={back}
        title={budget.code ?? '—'}
        subtitle={
          <>
            {d.client?.legal_name ?? '—'}
            {d.client?.rut && ` · RUT ${d.client.rut}`}
          </>
        }
        tags={
          budget.status && (
            <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
          )
        }
        actions={
          <>
            {/* Ação primária primeiro; destrutivo por último (UI-B5). */}
            <AppButton
              variant="brandIcon"
              label={t('budget.addQuote')}
              icon="pi pi-file"
              onClick={() => d.openWizard(null)}
            />
            {/* Único caminho de edição: o backend só deixa payment_terms mudar. */}
            <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={d.openEdit} />
            <AppButton
              label={t('common.delete')}
              icon="pi pi-trash"
              outlined
              severity="danger"
              onClick={d.askDeleteBudget}
            />
          </>
        }
      />

      <div className="space-y-6">
        {/* Os três totais vêm SOMADOS do backend (bcmath). A UI nunca soma UF. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('budget.totalQuoted')} value={budget.total_value_uf} />
          <StatCard label={t('budget.totalApproved')} value={budget.total_approved_uf} tone="success" />
          <StatCard label={t('budget.totalRejected')} value={budget.total_rejected_uf} tone="danger" />
        </div>

        <AppCard>
          <AppCardHeader title={t('budget.quotes')} count={budget.quotes.length} />
          <QuotesList
            quotes={budget.quotes}
            onEdit={(q) => d.openWizard(q)}
            onRemove={(q) => d.askConfirm('remove', q)}
            onApprove={d.canApprove ? (q) => d.askConfirm('approve', q) : undefined}
            onReject={d.canApprove ? (q) => d.askConfirm('reject', q) : undefined}
          />
        </AppCard>

        <BudgetDocumentsCard
          files={budget.files ?? []}
          fileType={d.fileType}
          onFileTypeChange={d.setFileType}
          uploadPending={d.uploadPending}
          onUpload={d.handleUpload}
          onSizeReject={d.onFileSizeReject}
          onRemove={(fileId) => d.removeFile(fileId)}
          fileError={d.fileError}
          fileSizeError={d.fileSizeError}
        />

        {/* Reusa o dialog em modo edit — trava cliente e código, só payment_terms muda. */}
        {d.editing && (
          <BudgetDialog visible mode="edit" budget={budget} onHide={d.closeEdit} />
        )}

        {d.wizard && (
          <QuoteWizard visible budgetId={budgetId} quote={d.wizard.quote} onHide={d.closeWizard} />
        )}

        {d.confirm && (
          <ConfirmDialog
            visible
            title={t(CONFIRM_COPY[d.confirm.action].title)}
            message={t(CONFIRM_COPY[d.confirm.action].body)}
            confirmLabel={t(CONFIRM_COPY[d.confirm.action].label)}
            severity={d.confirm.action === 'approve' ? undefined : 'danger'}
            pending={d.confirmPending}
            error={d.confirmError}
            onCancel={d.closeConfirm}
            onConfirm={d.runConfirm}
          />
        )}

        {d.confirmDeleteBudget && (
          <ConfirmDialog
            visible
            title={t('budget.confirmDeleteTitle')}
            message={t('budget.confirmDeleteBody')}
            confirmLabel={t('common.delete')}
            severity="danger"
            pending={d.removeBudgetPending}
            error={d.removeBudgetError}
            onCancel={d.closeDeleteBudget}
            onConfirm={d.deleteBudget}
          />
        )}
      </div>
    </div>
  )
}

const CONFIRM_COPY = {
  approve: { title: 'quote.confirmApproveTitle', body: 'quote.confirmApproveBody', label: 'quote.approve' },
  reject: { title: 'quote.confirmRejectTitle', body: 'quote.confirmRejectBody', label: 'quote.reject' },
  remove: { title: 'quote.confirmDeleteTitle', body: 'quote.confirmDeleteBody', label: 'common.delete' },
} as const

/** O número É o sinal: o `AppCard variant="stat"` já tinge texto, fundo e borda
 * pelo `tone`, então aqui não há cor nenhuma — só composição. */
function StatCard({ label, value, tone }: { label: string; value?: string; tone?: AppCardTone }) {
  return (
    <AppCard variant="stat" tone={tone}>
      <p className="text-2xl font-semibold">{formatUf(value ?? '0')} UF</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{label}</p>
    </AppCard>
  )
}
