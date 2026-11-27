import { useTranslation } from 'react-i18next'
import { ArchiveConfirmDialog, ConfirmDialog } from '@shared/ui'
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
        <QuoteWizard
          visible
          budgetId={budgetId}
          quote={d.wizard.quote}
          onlyUf={d.wizard.quote?.status === 'approved' && !!d.wizard.quote.turma_status}
          onHide={d.closeWizard}
        />
      )}

      {d.confirm && (
        <ConfirmDialog
          visible
          title={t(CONFIRM_COPY[d.confirm.action].title, { code: d.confirm.quote.code ?? '—' })}
          message={t(CONFIRM_COPY[d.confirm.action].body, { code: d.confirm.quote.code ?? '—' })}
          confirmLabel={t(CONFIRM_COPY[d.confirm.action].label)}
          severity={d.confirm.action === 'approve' ? undefined : 'danger'}
          pending={d.confirmPending}
          error={d.confirmError}
          onCancel={d.closeConfirm}
          onConfirm={d.runConfirm}
        />
      )}

      {/* O "excluir" do orçamento arquiva (as cotações vão junto, e Restaurar
        * desfaz): é a confirmação do arquivamento, com o texto e a severidade
        * dele, e não um `danger` que promete uma eliminação que não acontece.
        * O sucesso navega para fora, então o `onSuccess` do diálogo não importa. */}
      {d.confirmDeleteBudget && (
        <ArchiveConfirmDialog
          target={budget}
          name={budget.code ?? '—'}
          pending={d.removeBudgetPending}
          error={d.removeBudgetError}
          onArchive={() => d.deleteBudget()}
          onCancel={d.closeDeleteBudget}
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
