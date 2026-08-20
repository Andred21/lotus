import { useArchivedPage } from '@shared/hooks'
import type { ArchivedEnrollmentData, EnrollmentData } from '@shared/types/generated'
import { useEnrollmentsArchivedList, useRestoreEnrollment } from '../api/useEnrollments'

/** Mesma construção do `useTurmasArchived`, com o id do pai fechado no closure —
 * por isso a fábrica é função e não constante de módulo. */
function recursoDeMatriculas(turmaId: number) {
  return {
    useArchivedList: function useArchivedList(enabled: boolean) {
      return useEnrollmentsArchivedList(turmaId, enabled)
    },
    useRestore: function useRestore() {
      return useRestoreEnrollment(turmaId)
    },
  }
}

/** Não há `archive` aqui: arquivar matrícula continua sendo o `remove` do
 * `useEnrollmentSection`, que já tem ConfirmDialog e banner de erro próprios. O
 * par de toasts do restore vive em `useArchivedPage` (Q-3 do review de
 * 2026-08-19). */
export function useEnrollmentsArchived(turmaId: number) {
  return useArchivedPage<EnrollmentData, ArchivedEnrollmentData>(
    recursoDeMatriculas(turmaId),
    (row) => row.enrollment,
  )
}
