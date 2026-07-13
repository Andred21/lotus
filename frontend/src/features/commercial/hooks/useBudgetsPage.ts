import { useCrudPage } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'

export function useBudgetsPage() {
  return useCrudPage(budgetsApi)
}
