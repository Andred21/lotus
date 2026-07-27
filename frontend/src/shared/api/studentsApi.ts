import { createCrudResource } from './createCrudResource'
import type { StudentData } from '@shared/types/generated'

/** Cliente REST do recurso `students`. Camada de dados compartilhada (ADR-18).
 *
 * `useOne` desta fábrica NÃO é usado: o detalhe do aluno responde
 * `StudentDetailData` (com vínculos e turmas), não `StudentData`, e vive em
 * `features/identity/api/useStudentDetail.ts`. */
export const studentsApi = createCrudResource<StudentData>('students')
