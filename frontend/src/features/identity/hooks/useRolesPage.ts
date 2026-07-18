import { useCrudPage } from '@shared/hooks'
import { rolesApi } from '@shared/api/rolesApi'

export function useRolesPage() {
  return useCrudPage(rolesApi)
}
