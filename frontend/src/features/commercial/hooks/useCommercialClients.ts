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
  /** O ClientData inteiro: a query já o traz, e estreitar para o nome
   * obrigava a tabela a renderizar texto cru onde cabe célula de identidade.
   * `clientName` continua porque o diálogo depende dele — e o fallback da
   * tabela também, quando o id não resolve. Ele DERIVA daqui: eram duas
   * varreduras com o mesmo predicado, e duas varreduras divergem. */
  const client = (id: number) => load.data.find((c) => c.id === id) ?? null

  return {
    ...load,
    client,
    clientName: (id: number) => client(id)?.legal_name ?? '—',
    clientOptions: load.data.map((c) => ({ label: c.legal_name, value: c.id })),
  }
}
