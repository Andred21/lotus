import { useCrudPage } from '@shared/hooks'
import { redatoresApi } from '../api/redatoresApi'

export function useRedatoresPage() {
  return useCrudPage(redatoresApi)
}
