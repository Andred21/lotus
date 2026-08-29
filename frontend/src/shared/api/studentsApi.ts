import { createCrudResource } from './createCrudResource'
import { pageEndpoint } from './page'
import type { StudentData } from '@shared/types/generated'

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
}
