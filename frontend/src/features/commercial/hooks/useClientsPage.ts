import { useCrudPage } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'

export function useClientsPage() {
  return useCrudPage(clientsApi)
}
