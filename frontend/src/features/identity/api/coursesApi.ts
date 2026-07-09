import { createCrudResource } from '@shared/api/createCrudResource'
import type { CourseData } from '@shared/types/generated'

/** Só leitura aqui: o dialog do redator lista cursos para as habilitações.
 * Não importa a feature catalog — usa a fábrica shared + o tipo shared. */
export const coursesApi = createCrudResource<CourseData>('courses')
