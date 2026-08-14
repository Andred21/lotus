import { clientsApi } from '@shared/api/clientsApi'
import type { ProblemDetails } from '@shared/api/axios'

/** Clientes das duas telas de orçamento: a tabela resolve o nome por id, o
 * diálogo monta as opções do dropdown. Um hook só para os dois consumidores —
 * é a mesma lista e o mesmo lookup, e a chave do TanStack já é compartilhada. */
export function useCommercialClients() {
  const clients = clientsApi.useList()

  return {
    isLoading: clients.isLoading,
    /** Falha do GET no formato que `AppDataTable`/`AppErrorState` leem. `{}` quando
     * o interceptor não populou o corpo: `isError` sem `error` ainda é falha, e
     * devolver `null` a esconderia. */
    loadError: clients.isError ? (clients.error ?? ({} as ProblemDetails)) : null,
    refetch: () => {
      void clients.refetch()
    },
    clientName: (id: number) => clients.data?.find((c) => c.id === id)?.legal_name ?? '—',
    /** O ClientData inteiro: a query já o traz, e estreitar para o nome
     * obrigava a tabela a renderizar texto cru onde cabe célula de identidade.
     * `clientName` continua porque o diálogo depende dele — e o fallback da
     * tabela também, quando o id não resolve. */
    client: (id: number) => clients.data?.find((c) => c.id === id) ?? null,
    clientOptions: (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id })),
  }
}
