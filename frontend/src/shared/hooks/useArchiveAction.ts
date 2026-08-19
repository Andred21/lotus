import type { ProblemDetails } from '@shared/api/axios'
import { useArchiveToasts } from './useArchiveToasts'

/** O mínimo que o hook exige da mutation de arquivar — estrutural, como o
 * `ArchivableResource`: `coursesApi.useRemove()` satisfaz, e o `useArchiveTurma`
 * artesanal também. */
interface ArchiveMutation {
  mutate: (
    id: number,
    options?: { onSuccess?: () => void; onError?: (problem: ProblemDetails) => void },
  ) => void
  isPending: boolean
}

/**
 * Arquivar com os toasts dos dois lados. Par do `useArchivedPage`, e separado
 * dele de propósito: `Budget`, `Quote` e `Enrollment` têm visão de arquivados
 * SEM botão de arquivar próprio (o deles vive no detalhe do pai), e um parâmetro
 * opcional deixaria `archive` chamável onde não há mutation nenhuma por trás.
 *
 * `onSuccess` do chamador fecha o ConfirmDialog — ele só fecha no sucesso, para
 * o 403/422 ter onde pousar.
 */
export function useArchiveAction(mutation: ArchiveMutation) {
  const toasts = useArchiveToasts()

  return {
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      mutation.mutate(id, {
        onSuccess: () => {
          toasts.archived()
          options?.onSuccess?.()
        },
        onError: toasts.failed,
      }),
    archiving: mutation.isPending,
  }
}
