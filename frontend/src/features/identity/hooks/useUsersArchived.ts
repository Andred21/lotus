import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { usersApi } from '@shared/api/usersApi'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedUserData, UserData } from '@shared/types/generated'

/** Molde: `useClientsArchived`. É este arquivo que mantém `usersApi` fora de
 * `AdministracionPage` (lint `no-restricted-syntax`).
 *
 * O `onError` importa em especial aqui: arquivar o último superadmin ativo é
 * recusado com 422 pelo `SuperadminGuard`, e sem o toast o clique fica mudo. */
export function useUsersArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<UserData, ArchivedUserData>(usersApi, (row) => row.user)
  const archiveMutation = usersApi.useRemove()

  const falhou = (problem: Parameters<typeof problemMessage>[0]) => {
    const message = problemMessage(problem)
    if (message) toast.error(message)
  }

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: falhou,
      }),
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      archiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t('archive.archivedToast'))
          options?.onSuccess?.()
        },
        onError: falhou,
      }),
    archiving: archiveMutation.isPending,
  }
}
