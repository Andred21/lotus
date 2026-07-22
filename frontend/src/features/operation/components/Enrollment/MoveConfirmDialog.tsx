import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton } from '@shared/ui'

type Props = {
  visible: boolean
  studentName: string
  previousClient: string | null
  currentClient: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** Confirma a troca de cliente ANTES de matricular (RN-10). Sem este passo, um
 * RUT de outro cliente moveria o aluno silenciosamente — o usuário precisa ver
 * "de X para Y" e confirmar; cancelar não matricula ninguém. */
export function MoveConfirmDialog({
  visible,
  studentName,
  previousClient,
  currentClient,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation()
  return (
    <AppDialog visible={visible} header={t('operation.enrollment.move.title')} onHide={onCancel}>
      <p className="mb-4 text-sm">
        {t('operation.enrollment.move.body', {
          name: studentName,
          previous: previousClient ?? '—',
          current: currentClient ?? '—',
        })}
      </p>
      <div className="flex justify-end gap-2">
        <AppButton label={t('operation.enrollment.move.cancel')} outlined onClick={onCancel} />
        <AppButton label={t('operation.enrollment.move.confirm')} severity="warning" onClick={onConfirm} />
      </div>
    </AppDialog>
  )
}
