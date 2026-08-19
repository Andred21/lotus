import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de orçamentos. Extraído da `BudgetsTable` pela mesma
 * razão do `ClientRowActions`: a célula ramifica por modo e a régua de 150 linhas
 * de `features/<x>/components/` vale sem exceção.
 *
 * Em `archived` o olho SAI. A rota de detalhe (`GET /api/budgets/{budget}`) usa o
 * binding padrão e não enxerga registro soft-deletado: o botão levaria a uma tela
 * de 404. Restaurar primeiro, abrir depois.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07).
 */
export function BudgetRowActions({
  budget,
  archived,
  busy,
  onView,
  onRestore,
}: {
  budget: BudgetData
  archived: boolean
  /** Restore em voo: sem isto o clique duplo dispara dois POSTs (Q-2). */
  busy: boolean
  onView: (b: BudgetData) => void
  onRestore: (b: BudgetData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (archived) {
    return can('commercial.budget.restore') ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(budget)}
      />
    ) : null
  }

  return (
    <AppButton
      icon="pi pi-eye"
      text
      rounded
      aria-label={t('common.view')}
      onClick={() => onView(budget)}
    />
  )
}
