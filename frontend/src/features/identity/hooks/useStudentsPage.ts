import { useCrudPage } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'

/** Alias de página do recurso de alunos.
 *
 * Parece delegação vazia e não é: `useCrudPage` chama `resource.useList()` por
 * dentro, então **este arquivo é o que mantém a query fora do componente**.
 * Eliminá-lo moveria `studentsApi` para dentro de `PeoplePage` — regressão
 * da fronteira zerada em 2026-08-03, e que passaria no lint antigo, porque o
 * seletor casava `studentsApi.useList()` e não `useCrudPage(studentsApi)`.
 * Esse escape foi fechado em 2026-08-04 (spec D5); o alias é o caminho suportado. */
export function useStudentsPage() {
  // `staleTime` pelo mesmo motivo da `useRedatoresPage` (D-04): a aba desmonta
  // na troca, e sem ele a volta paga GET.
  return useCrudPage(studentsApi, { staleTime: 30_000 })
}
