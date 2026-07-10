import { useCrudPage } from '@shared/hooks'
import { redatoresApi } from '@shared/api/redatoresApi'

export function useRedatoresPage() {
  return useCrudPage(redatoresApi)
}
