import { useCrudPage } from '@shared/hooks'
import { rolesApi } from '@shared/api/rolesApi'

/** Alias de página do recurso de papéis (roles).
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `rolesApi` para dentro de `AdministracionPage` —
 * regressão da fronteira zerada em 2026-08-03, e que passaria no lint antigo,
 * porque o seletor casava `rolesApi.useList()` e não `useCrudPage(rolesApi)`.
 * Esse escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
export function useRolesPage() {
  return useCrudPage(rolesApi)
}
