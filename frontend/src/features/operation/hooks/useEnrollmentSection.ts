import type { TurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useEnrollments, useRemoveEnrollment } from '../api/useEnrollments'

/** Orquestra a lista/remoção da aba Alumnos. O componente só consome.
 *
 * A confirmação de remoção usa o `ConfirmDialog` de `shared/ui` (P-11 fechada na
 * Parte 3 do bloco visual): o antigo alerta nativo do navegador não era
 * estilizável, não respeitava o tema e não mostrava erro de mutação. */
export function useEnrollmentSection(turma: TurmaData) {
  const turmaId = turma.id!
  const list = useEnrollments(turmaId)
  const removeMutation = useRemoveEnrollment()
  const { message: error } = useMutationErrors([removeMutation.error])

  const remove = (enrollmentId: number, options?: { onSuccess?: () => void }) =>
    removeMutation.mutate({ turmaId, enrollmentId }, { onSuccess: options?.onSuccess })

  return {
    enrollments: list.data ?? [],
    loading: list.isLoading,
    remove,
    removing: removeMutation.isPending,
    error,
    resetRemove: () => removeMutation.reset(),
  }
}
