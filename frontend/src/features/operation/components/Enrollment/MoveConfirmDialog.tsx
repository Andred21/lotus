import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@shared/ui'

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
 * "de X para Y" e confirmar; cancelar não matricula ninguém. É aviso, não
 * perigo: muda o vínculo do aluno, mas não destrói nada (`warning`). */
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
    <ConfirmDialog
      visible={visible}
      severity="warning"
      title={t('operation.enrollment.move.title')}
      message={t('operation.enrollment.move.body', {
        name: studentName,
        previous: previousClient ?? '—',
        current: currentClient ?? '—',
      })}
      confirmLabel={t('operation.enrollment.move.confirm')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
