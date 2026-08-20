import { usePermissions } from '@shared/hooks'
import { ArchiveRowActions } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'

/** Adaptador de orçamento para o `ArchiveRowActions` de `shared/ui` (Q-3 do
 * review de 2026-08-19).
 *
 * SEM `canArchive`: arquivar orçamento é ação da tela de detalhe, e um segundo
 * caminho para a mesma mutação é o que o `useBudgetsArchived` recusa ter. */
export function BudgetRowActions({
  budget,
  archived,
  busy,
  onView,
  onRestore,
}: {
  budget: BudgetData
  archived: boolean
  busy: boolean
  onView: (b: BudgetData) => void
  onRestore: (b: BudgetData) => void
}) {
  const { can } = usePermissions()

  return (
    <ArchiveRowActions
      archived={archived}
      busy={busy}
      canRestore={can('commercial.budget.restore')}
      onRestore={() => onRestore(budget)}
      onView={() => onView(budget)}
    />
  )
}
