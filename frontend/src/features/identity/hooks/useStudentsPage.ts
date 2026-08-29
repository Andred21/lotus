import { useCrudDialog, useServerTable } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'

/** A página de alunos: lista paginada no servidor + dialog por id.
 *
 * Parece delegação e não é: `useServerTable` chama `useQuery` por dentro,
 * então **este arquivo é o que mantém a query fora do componente**
 * (`no-restricted-syntax`, frontend-fsliced.md). `staleTime` pelo mesmo
 * motivo da `useRedatoresPage` (D-04): a aba desmonta na troca, e sem ele a
 * volta paga GET — catraca em `PeoplePage.test.tsx`. */
export function useStudentsPage() {
  const table = useServerTable(studentsApi.page, { key: studentsApi.keys.lists(), staleTime: 30_000 })
  const dialog = useCrudDialog(table.rows, studentsApi.useOne)

  return { table, ...dialog }
}
