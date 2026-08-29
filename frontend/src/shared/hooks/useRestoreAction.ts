import type { ProblemDetails } from '@shared/api/axios'
import { useArchiveToasts } from './useArchiveToasts'

/** Callbacks EXTRA da mutation de restore, para quem chama. O toast dos dois
 * lados já é do hook (Q-3 do review de 2026-08-19); estes existem para o
 * chamador que precisa fechar um diálogo ou navegar depois. */
export interface RestoreOptions {
  onSuccess?: () => void
  onError?: (problem: ProblemDetails) => void
}

/** O mínimo da mutation de restaurar — estrutural, como o `ArchiveMutation`
 * do `useArchiveAction`. */
interface RestoreMutation {
  mutate: (id: number, options?: RestoreOptions) => void
  isPending: boolean
}

/**
 * Restaurar com os toasts dos dois lados. Par do `useArchiveAction`, e
 * extraído do `useArchivedPage` quando a lista de turmas arquivadas passou a
 * vir do `useServerTable`: a tela precisa do restore sem precisar do modo e
 * da lista que o `useArchivedPage` carrega junto. O `useArchivedPage` compõe
 * este hook — a política do toast continua tendo um dono só.
 */
export function useRestoreAction(mutation: RestoreMutation) {
  const toasts = useArchiveToasts()

  return {
    /** O toast MORA aqui, nos dois sentidos: sem o de erro, um 403 de quem não
     * tem `*.restore` e os 422 dos gates não mudam nada na tela (Q-2 do review
     * de 2026-08-18). */
    restore: (id: number, options?: RestoreOptions) =>
      mutation.mutate(id, {
        onSuccess: () => {
          toasts.restored()
          options?.onSuccess?.()
        },
        onError: (problem) => {
          toasts.failed(problem)
          options?.onError?.(problem)
        },
      }),
    restoring: mutation.isPending,
  }
}
