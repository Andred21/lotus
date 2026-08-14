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
    isError: clients.isError,
    errorDetail: clients.error?.detail,
    /** Lista que carregou e veio vazia de verdade — nem falha, nem carregando.
     * Tem mensagem própria, distinta da de falha. */
    showEmptyHint: !clients.isError && clients.isSuccess && clients.data.length === 0,
    /** Sem lista utilizável: carregando, falhou sem cache, ou veio vazia. `[]` é
     * truthy, então `!clients.data` deixaria passar lista vazia. Um refetch que
     * falha com dado já em cache NÃO trava o form (precedente `03280c6`). */
    unusable: !clients.data?.length,
    refetch: () => {
      void clients.refetch()
    },
    clientName: (id: number) => clients.data?.find((c) => c.id === id)?.legal_name ?? '—',
    clientOptions: (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id })),
  }
}
