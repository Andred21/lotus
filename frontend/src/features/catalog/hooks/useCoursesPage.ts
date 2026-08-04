import { useCrudPage } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'

/** Alias de página do recurso de cursos.
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `coursesApi` para dentro de `CatalogPage` — regressão
 * da fronteira zerada em 2026-08-03, e que passaria no lint antigo,
 * porque o seletor casava `coursesApi.useList()` e não `useCrudPage(coursesApi)`.
 * Esse escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
export function useCoursesPage() {
  return useCrudPage(coursesApi)
}
