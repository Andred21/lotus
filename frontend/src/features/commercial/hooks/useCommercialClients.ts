import { useLoadState } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'

/** Clientes das duas telas de orçamento: a tabela resolve o nome por id, o
 * diálogo monta as opções do dropdown. Um hook só para os dois consumidores —
 * é a mesma lista e o mesmo lookup, e a chave do TanStack já é compartilhada.
 *
 * Estados de carga (`isLoading`, `isError`, `isEmpty`, `unusable`, `loadError`)
 * vêm do `useLoadState`; aqui ficam só o lookup e as opções. */
export function useCommercialClients() {
  const load = useLoadState(clientsApi.useList())

  return {
    ...load,
    clientName: (id: number) => load.data.find((c) => c.id === id)?.legal_name ?? '—',
    clientOptions: load.data.map((c) => ({ label: c.legal_name, value: c.id })),
  }
}
