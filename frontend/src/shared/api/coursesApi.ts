import { createCrudResource } from './createCrudResource'
import type { CourseData } from '@shared/types/generated'

/** Recurso `courses`, compartilhado: o dialog do redator lista cursos para as
 * habilitações, e o módulo de Catálogo o consome direto. Vive em `shared` porque
 * mais de uma feature precisa dele e feature não importa feature (ADR-05). */
export const coursesApi = createCrudResource<CourseData>('courses')
