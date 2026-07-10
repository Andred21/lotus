import { useCrudPage } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'

export function useCoursesPage() {
  return useCrudPage(coursesApi)
}
