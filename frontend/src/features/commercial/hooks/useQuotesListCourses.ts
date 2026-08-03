import { coursesApi } from '@shared/api/coursesApi'

/** Nome do curso por id para a lista de cotações. Só lookup: a lista não tem
 * onde mostrar erro de GET de curso (o `—` é o fallback de hoje), e mudar isso
 * é o B-7 — fora deste bloco. */
export function useQuotesListCourses() {
  const courses = coursesApi.useList()

  return {
    courseName: (id: number) => courses.data?.find((c) => c.id === id)?.name ?? '—',
  }
}
