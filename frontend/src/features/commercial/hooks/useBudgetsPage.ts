import { useCrudPage } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'

/** Alias de página do recurso de orçamentos.
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `budgetsApi` para dentro de `CommercialPage` — regressão
 * da fronteira zerada em 2026-08-03, e que passaria no lint antigo, porque o
 * seletor casava `budgetsApi.useList()` e não `useCrudPage(budgetsApi)`. Esse
 * escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
export function useBudgetsPage() {
  return useCrudPage(budgetsApi)
}
