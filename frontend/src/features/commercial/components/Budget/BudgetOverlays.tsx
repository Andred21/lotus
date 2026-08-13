import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'
import type { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { BudgetDialog } from './BudgetDialog'
import { QuoteWizard } from './QuoteWizard'

export function BudgetOverlays({ d, budgetId, budget }: { d: ReturnType<typeof useBudgetDetail>; budgetId: number; budget: BudgetData }) {
  const { t } = useTranslation()

  return (
    <>
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
    </>
  )
}

const CONFIRM_COPY = {
  approve: { title: 'quote.confirmApproveTitle', body: 'quote.confirmApproveBody', label: 'quote.approve' },
  reject: { title: 'quote.confirmRejectTitle', body: 'quote.confirmRejectBody', label: 'quote.reject' },
  remove: { title: 'quote.confirmDeleteTitle', body: 'quote.confirmDeleteBody', label: 'common.delete' },
} as const
