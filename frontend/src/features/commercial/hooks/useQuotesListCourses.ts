import { coursesApi } from '@shared/api/coursesApi'

/** Nome do curso por id para a lista de cotações.
 *
 * O `'—'` FICA: numa lista carregada, id que não casa é dado (curso removido),
 * não falha. Quem desambigua GET falho é `isError`, exposto ao lado — sem ele um
 * 500 pintava a coluna inteira de `—` em silêncio (B-7, spec D6). */
export function useQuotesListCourses() {
  const courses = coursesApi.useList()

  return {
    courseName: (id: number) => courses.data?.find((c) => c.id === id)?.name ?? '—',
    isError: courses.isError,
    errorDetail: courses.error?.detail,
    refetch: () => {
      void courses.refetch()
    },
  }
}
