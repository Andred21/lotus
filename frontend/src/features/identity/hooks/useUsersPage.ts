import { useCrudPage } from '@shared/hooks'
import { usersApi } from '@shared/api/usersApi'

/** Alias de página do recurso de usuários internos (admin/redator).
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `usersApi` para dentro de `AdministracionPage` —
 * regressão da fronteira zerada em 2026-08-03, e que passaria no lint antigo,
 * porque o seletor casava `usersApi.useList()` e não `useCrudPage(usersApi)`.
 * Esse escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
export function useUsersPage() {
  return useCrudPage(usersApi)
}
