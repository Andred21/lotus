import { useCrudPage } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'

/** Alias de página do recurso de clientes.
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `clientsApi` para dentro de `CommercialPage` — regressão
 * da fronteira zerada em 2026-08-03, e que passaria no lint antigo, porque o
 * seletor casava `clientsApi.useList()` e não `useCrudPage(clientsApi)`. Esse
 * escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
export function useClientsPage() {
  return useCrudPage(clientsApi)
}
