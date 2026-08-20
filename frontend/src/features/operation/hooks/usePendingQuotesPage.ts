import type { ProblemDetails } from '@shared/api/axios'
import { usePendingQuotes } from '../api/useTurmas'

/**
 * A fila de cotizações pendentes de configuração, na mesma forma normalizada do
 * `useTurmasPage` — arquivo próprio porque a convenção dos outros 7 aliases
 * `useXPage` é um hook por arquivo, com o nome do hook (Q-1 do review do BD-17).
 *
 * Não é superfície de arquivados — alimenta o `PendingQuotesPanel` —, mas
 * carregava o MESMO `isError ? (error ?? {}) : null` cru dentro da prop
 * (`OperationPage:31` antes do bloco), e a ficha do D-52 o nomeia.
 *
 * O motivo de não usar `useLoadState` está no docblock do `useTurmasPage`: o
 * `refetch` dele engole a promise que o `AppErrorState` aguarda (Q-14 · D-54).
 */
export function usePendingQuotesPage() {
  const query = usePendingQuotes()

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Devolve a promise (Q-14). */
    refetch: () => query.refetch(),
  }
}
