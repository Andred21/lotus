import type { TurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useEnrollments, useRemoveEnrollment } from '../api/useEnrollments'

/** Orquestra a lista/remoção da aba Alumnos. O componente só consome.
 *
 * `@shared/ui` não exporta `useConfirm` — a confirmação de remoção fica no
 * `EnrollmentTable` via `window.confirm` (ver componente). Remoção de
 * matrícula é reversível (soft-delete + rematrícula restaura), então uma
 * confirmação leve basta; não inventamos wrapper novo nesta task. */
export function useEnrollmentSection(turma: TurmaData) {
  const turmaId = turma.id!
  const list = useEnrollments(turmaId)
  const removeMutation = useRemoveEnrollment()
  const { message: error } = useMutationErrors([removeMutation.error])

  const remove = (enrollmentId: number) =>
    removeMutation.mutate({ turmaId, enrollmentId })

  return {
    enrollments: list.data ?? [],
    loading: list.isLoading,
    remove,
    removing: removeMutation.isPending,
    error,
  }
}
