import { useTranslation } from 'react-i18next'
import { RowActions, type RowAction } from '@shared/ui'

/**
 * As ações da linha da matrícula: registrar resultado (com
 * `operation.enrollment.manage`) e remover. Já eram ícones, montados à mão
 * fora do `RowActions` — e por isso não colapsavam: em 390x844 a presa de 9rem
 * cobria 172px do nome (item 23, `D-65`).
 *
 * `canManage` chega como booleano: quem lê a permissão é a tabela.
 */
export function EnrollmentRowActions({
  canManage,
  removing,
  onResult,
  onRemove,
  collapsed,
}: {
  canManage: boolean
  /** Remoção em voo: trava o botão contra o clique duplo. */
  removing: boolean
  onResult: () => void
  onRemove: () => void
  collapsed: boolean
}) {
  const { t } = useTranslation()

  const actions: RowAction[] = []
  if (canManage) {
    actions.push({ label: t('certificate.result.action'), icon: 'pi pi-pencil', tooltip: true, onClick: onResult })
  }
  actions.push({
    label: t('operation.enrollment.remove'),
    icon: 'pi pi-times',
    tooltip: true,
    severity: 'danger',
    disabled: removing,
    onClick: onRemove,
  })

  return <RowActions actions={actions} collapsed={collapsed} />
}
