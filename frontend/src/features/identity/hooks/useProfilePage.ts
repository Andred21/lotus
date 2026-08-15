import { useResourceState } from '@shared/hooks'
import { useProfile } from '../api/useProfile'

/**
 * Alias de página: existe para a query NÃO viver no componente.
 *
 * Não é delegação vazia — é o que mantém `useQuery` fora de
 * `components/**`, do mesmo jeito que os 7 `useXPage` das outras features.
 * Eliminá-lo regrediria a fronteira, e o lint não veria (frontend-fsliced.md).
 */
export function useProfilePage() {
  return useResourceState(useProfile())
}
