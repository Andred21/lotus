import { useCrudPage } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'

export function useStudentsPage() {
  return useCrudPage(studentsApi)
}
