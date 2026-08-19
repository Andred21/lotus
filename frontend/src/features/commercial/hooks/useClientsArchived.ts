import { useArchiveAction, useArchivedPage } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'
import type { ArchivedClientData, ClientData } from '@shared/types/generated'

/** Mesma razão do `useClientsPage`: é este arquivo que mantém `clientsApi` fora
 * de `CommercialPage` (lint `no-restricted-syntax`). O par de toasts vive em
 * `useArchivedPage`/`useArchiveAction` (Q-3 do review de 2026-08-19). */
export function useClientsArchived() {
  const page = useArchivedPage<ClientData, ArchivedClientData>(clientsApi, (row) => row.client)

  return { ...page, ...useArchiveAction(clientsApi.useRemove()) }
}
