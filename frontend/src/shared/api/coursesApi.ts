import { createCrudResource } from './createCrudResource'
import type { CourseData } from '@shared/types/generated'

/** Cliente REST do recurso `courses`. Camada de dados compartilhada (ADR-18):
 * o dialog do redator lista cursos para as habilitações e o módulo Catálogo o
 * consome direto. Glue burro sobre a rota pública — regra e telas nas features. */
export const coursesApi = createCrudResource<CourseData>('courses')
