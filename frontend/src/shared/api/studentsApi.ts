import { useQuery } from '@tanstack/react-query'
import { createCrudResource } from './createCrudResource'
import { pageEndpoint } from './page'
import { api } from './axios'
import type { ProblemDetails } from './axios'
import type { StudentClientOptionData, StudentData } from '@shared/types/generated'

/** Cliente REST do recurso `students`. Camada de dados compartilhada (ADR-18).
 *
 * `page` é a listagem (spec D1: `GET /api/students` pagina no servidor);
 * `useList` da fábrica NÃO é usado — o endpoint devolve `{ data, meta }`, não
 * array. `useOne` É usado, pelo `useCrudDialog` (D14): o detalhe responde
 * `StudentDetailData`, superconjunto estrutural de `StudentData` (mesmos
 * campos mais `links`/`turmas`), sob a MESMA chave que `useStudentDetail` lê
 * (`features/identity/api/useStudentDetail.ts`) — o cache não fragmenta. */
export const studentsApi = {
  ...createCrudResource<StudentData>('students'),
  page: pageEndpoint<StudentData>('/api/students'),
  /** As empresas do dropdown do create. `enabled` é PARÂMETRO: fora do create o
   * campo é texto e não há lista a buscar (mesma lição da D-04). */
  useClientOptions: (enabled: boolean) =>
    useQuery<StudentClientOptionData[], ProblemDetails>({
      queryKey: ['students', 'client-options'] as const,
      queryFn: () => api.get<StudentClientOptionData[]>('/api/students/client-options').then((r) => r.data),
      enabled,
    }),
}
