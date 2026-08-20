import { useArchiveAction, useArchivedPage } from '@shared/hooks'
import { usersApi } from '@shared/api/usersApi'
import type { ArchivedUserData, UserData } from '@shared/types/generated'

/** Molde: `useClientsArchived`. É este arquivo que mantém `usersApi` fora de
 * `AdministracionPage` (lint `no-restricted-syntax`).
 *
 * O toast de erro importa em especial aqui: arquivar o último superadmin ativo é
 * recusado com 422 pelo `SuperadminGuard`, e sem ele o clique fica mudo. */
export function useUsersArchived() {
  const page = useArchivedPage<UserData, ArchivedUserData>(usersApi, (row) => row.user)

  return { ...page, ...useArchiveAction(usersApi.useRemove()) }
}
