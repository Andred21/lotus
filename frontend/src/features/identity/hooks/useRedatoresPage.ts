import { useCrudPage } from '@shared/hooks'
import { redatoresApi } from '@shared/api/redatoresApi'

/** Alias de página do recurso de redatores.
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `redatoresApi` para dentro de `PeoplePage` — regressão
 * da fronteira zerada em 2026-08-03, e que passaria no lint antigo, porque o
 * seletor casava `redatoresApi.useList()` e não `useCrudPage(redatoresApi)`.
 * Esse escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
export function useRedatoresPage() {
  return useCrudPage(redatoresApi)
}
