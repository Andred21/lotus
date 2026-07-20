import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { AppButton, AppTag, ConfirmDialog, AppFileUpload, AppDropdown } from '@shared/ui'
import type { BudgetFileType } from '../../api/useCommercialFiles'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { QuotesList } from './QuotesList'
import { BudgetDialog } from './BudgetDialog'
import { QuoteWizard } from './QuoteWizard'
import { FileList } from './FileList'

export function BudgetDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const budgetId = Number(id)
  const d = useBudgetDetail(budgetId)

  if (d.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
  if (!d.budget) return <p className="p-4 text-sm text-slate-500">{t('budget.notFound')}</p>

  const budget = d.budget

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={d.goBack}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('budget.back')}
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{budget.code}</h2>
          <p className="text-sm text-slate-500">
            {d.client?.legal_name ?? '—'}
            {d.client?.rut && ` · RUT ${d.client.rut}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {budget.status && (
            <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
          )}
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
        </div>
      </header>

      {/* Os três totais vêm SOMADOS do backend (bcmath). A UI nunca soma UF. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label={t('budget.totalQuoted')} value={budget.total_value_uf} />
        <TotalCard label={t('budget.totalApproved')} value={budget.total_approved_uf} tone="success" />
        <TotalCard label={t('budget.totalRejected')} value={budget.total_rejected_uf} tone="danger" />
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700">
        <header className="flex items-center justify-between p-4">
          <h3 className="font-medium">
            {t('budget.quotes')} <span className="text-slate-500">({budget.quotes.length})</span>
          </h3>
        </header>
        <QuotesList
          quotes={budget.quotes}
          onEdit={(q) => d.openWizard(q)}
          onRemove={(q) => d.askConfirm('remove', q)}
          onApprove={d.canApprove ? (q) => d.askConfirm('approve', q) : undefined}
          onReject={d.canApprove ? (q) => d.askConfirm('reject', q) : undefined}
        />
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700">
        <header className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h3 className="font-medium">{t('budget.documents')}</h3>
          <div className="flex items-center gap-2">
            <div className="w-44">
              <AppDropdown
                value={d.fileType}
                options={[
                  { label: t('budget.fileTypeInvoice'), value: 'invoice' },
                  { label: t('budget.fileTypeReceipt'), value: 'receipt' },
                ]}
                onChange={(e) => d.setFileType(e.value as BudgetFileType)}
              />
            </div>
            <AppFileUpload
              chooseOptions={{ icon: 'pi pi-upload' }}
              chooseLabel={t('budget.uploadDocument')}
              disabled={d.uploadPending}
              uploadHandler={d.handleUpload}
            />
          </div>
        </header>
        {d.fileError && (
          <p className="mx-4 mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {d.fileError}
          </p>
        )}
        <FileList files={budget.files ?? []} onRemove={(fileId) => d.removeFile(fileId)} />
      </section>

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
  )
}

const CONFIRM_COPY = {
  approve: { title: 'quote.confirmApproveTitle', body: 'quote.confirmApproveBody', label: 'quote.approve' },
  reject: { title: 'quote.confirmRejectTitle', body: 'quote.confirmRejectBody', label: 'quote.reject' },
  remove: { title: 'quote.confirmDeleteTitle', body: 'quote.confirmDeleteBody', label: 'common.delete' },
} as const

function TotalCard({ label, value, tone }: { label: string; value?: string; tone?: 'success' | 'danger' }) {
  const color =
    tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className={`text-2xl font-semibold ${color}`}>{formatUf(value ?? '0')} UF</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}
