import { useLoadState } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'

/** Nome do curso por id para a lista de cotações.
 *
 * O `'—'` FICA: numa lista carregada, id que não casa é dado (curso removido),
 * não falha. Quem desambigua GET falho é `isError`, vindo do `useLoadState` — sem
 * ele um 500 pintava a coluna inteira de `—` em silêncio (B-7, spec D6). */
export function useQuotesListCourses() {
  const load = useLoadState(coursesApi.useList())

  return {
    ...load,
    /** Se o id resolve na lista viva. É o que separa "a falha te custou este
     * nome" de "a falha não te custou nada" (review do BD-6, Q-1b). */
    hasCourse: (id: number) => load.data.some((c) => c.id === id),
    courseName: (id: number) => load.data.find((c) => c.id === id)?.name ?? '—',
  }
}
