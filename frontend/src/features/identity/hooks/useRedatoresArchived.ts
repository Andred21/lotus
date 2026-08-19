import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { redatoresApi } from '@shared/api/redatoresApi'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedRedatorData, RedatorData } from '@shared/types/generated'

/** Molde: `useClientsArchived`. É este arquivo que mantém `redatoresApi` fora de
 * `PeoplePage` (lint `no-restricted-syntax`).
 *
 * O TOAST mora aqui nos DOIS sentidos, e no redator o `onError` não é
 * conveniência: o arquivar tem gate de turma em andamento (spec D3) e devolve
 * **422** com a frase do que fazer. Sem o `onError`, o clique não muda nada na
 * tela e o operador não descobre por que (Q-2 do review de 2026-08-18). */
export function useRedatoresArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<RedatorData, ArchivedRedatorData>(redatoresApi, (row) => row.redator)
  const archiveMutation = redatoresApi.useRemove()

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
    /** `onSuccess` do chamador fecha o ConfirmDialog — ele só fecha no sucesso,
     * para o 422 do gate ter onde pousar. */
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
