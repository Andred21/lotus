import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { problemMessage } from '@shared/api/problemMessage'
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
 * `useEnrollmentSection`, que já tem ConfirmDialog e banner de erro próprios. */
export function useEnrollmentsArchived(turmaId: number) {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<EnrollmentData, ArchivedEnrollmentData>(
    recursoDeMatriculas(turmaId),
    (row) => row.enrollment,
  )

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: (problem) => {
          const message = problemMessage(problem)
          if (message) toast.error(message)
        },
      }),
  }
}
