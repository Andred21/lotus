import { useArchiveAction, useArchivedPage } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'
import type { ArchivedCourseData, CourseData } from '@shared/types/generated'

/** Mesma razão do `useCoursesPage`: mantém a query fora do componente, e o
 * `useRemove` do arquivar com ela (lint `no-restricted-syntax`). Toasts e
 * `problemMessage` moram nos dois hooks de `shared/` desde o Q-3 do review de
 * 2026-08-19 — este arquivo só diz QUAL recurso e QUAL agregado. */
export function useCoursesArchived() {
  const page = useArchivedPage<CourseData, ArchivedCourseData>(coursesApi, (row) => row.course)

  return { ...page, ...useArchiveAction(coursesApi.useRemove()) }
}
