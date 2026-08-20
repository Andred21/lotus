import { listSource } from '@shared/hooks'
import { usePendingQuotes } from '../api/useTurmas'

/**
 * A fila de cotizações pendentes de configuração, na mesma forma normalizada do
 * `useTurmasPage` — arquivo próprio porque a convenção dos outros 7 aliases
 * `useXPage` é um hook por arquivo, com o nome do hook (Q-1 do review do BD-17).
 *
 * Não é superfície de arquivados — alimenta o `PendingQuotesPanel` —, mas
 * carregava o MESMO `isError ? (error ?? {}) : null` cru dentro da prop
 * (`OperationPage:31` antes do BD-17), e a ficha do D-52 o nomeia.
 */
export function usePendingQuotesPage() {
  return listSource(usePendingQuotes())
}
