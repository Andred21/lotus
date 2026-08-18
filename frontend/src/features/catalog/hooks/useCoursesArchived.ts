import { useArchivedPage } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'
import type { ArchivedCourseData, CourseData } from '@shared/types/generated'

/** Mesma razão do `useCoursesPage`: mantém a query fora do componente. O
 * `useRemove` do arquivar entra aqui pelo mesmo motivo (gêmeo do
 * `useClientsArchived`). */
export function useCoursesArchived() {
  const page = useArchivedPage<CourseData, ArchivedCourseData>(coursesApi)
  const archive = coursesApi.useRemove()

  return { ...page, archive }
}
