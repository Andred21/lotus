import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'

type Props = {
  /** Matrícula a remover; `null` com o diálogo fechado. O dono do estado é a tabela, que abre o diálogo pela linha. */
  pending: EnrollmentData | null
  setPending: (e: EnrollmentData | null) => void
  onRemove: (enrollmentId: number, options?: { onSuccess?: () => void }) => void
  removing: boolean
  removeError?: string
  onResetRemove: () => void
}

/** Confirmação de remover matrícula — saiu do `EnrollmentTable` para ele caber no teto de linhas. */
export function RemoveEnrollmentDialog({ pending, setPending, onRemove, removing, removeError, onResetRemove }: Props) {
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      visible={pending !== null}
      title={t('operation.enrollment.removeTitle')}
      message={t('operation.enrollment.removeConfirm', { name: pending?.name ?? '' })}
      confirmLabel={t('operation.enrollment.remove')}
      severity="danger"
      pending={removing}
      error={removeError}
      onConfirm={() => {
        if (pending?.id == null || removing) return
        onRemove(pending.id, { onSuccess: () => setPending(null) })
      }}
      onCancel={() => {
        onResetRemove()
        setPending(null)
      }}
    />
  )
}
