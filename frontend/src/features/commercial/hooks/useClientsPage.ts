import { useCrudPage } from '@shared/hooks'
import { clientsApi } from '../api/clientsApi'

export function useClientsPage() {
  return useCrudPage(clientsApi)
}
