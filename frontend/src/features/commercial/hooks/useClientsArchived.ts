import { useArchivedPage } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'
import type { ArchivedClientData, ClientData } from '@shared/types/generated'

/** Mesma razão do `useClientsPage`: é este arquivo que mantém a query fora do
 * componente. Eliminá-lo moveria `clientsApi` para dentro de `CommercialPage`. */
export function useClientsArchived() {
  const page = useArchivedPage<ClientData, ArchivedClientData>(clientsApi)
  // O arquivar mora aqui pela MESMA razão: `useRemove` é mutação de recurso e
  // não pode ser chamada de dentro de `CommercialPage` (lint
  // `no-restricted-syntax`).
  const archive = clientsApi.useRemove()

  return { ...page, archive }
}
