import { useCrudPage } from '@shared/hooks'
import { usersApi } from '@shared/api/usersApi'

export function useUsersPage() {
  return useCrudPage(usersApi)
}
