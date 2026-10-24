import { useTranslation } from 'react-i18next'
import { RowActions, type RowAction } from '@shared/ui'

/**
 * As ações da linha da matrícula: registrar resultado (com
 * `operation.enrollment.record_result`) e remover (com
 * `operation.enrollment.manage`). Na turma concluída a tabela
 * desliga a remoção e, por matrícula, a correção (certificado vigente). Já
 * eram ícones, montados à mão fora do `RowActions` — e por isso não
 * colapsavam: em 390x844 a presa de 9rem cobria 172px do nome (item 23,
 * `D-65`).
 *
 * `canResult` e `canRemove` chegam como booleanos: quem lê a permissão e o
 * estado da turma é a tabela.
 */
export function EnrollmentRowActions({
  canResult,
  canRemove,
  removing,
  onResult,
  onRemove,
  collapsed,
}: {
  canResult: boolean
  canRemove: boolean
  /** Remoção em voo: trava o botão contra o clique duplo. */
  removing: boolean
  onResult: () => void
  onRemove: () => void
  collapsed: boolean
}) {
  const { t } = useTranslation()

  const actions: RowAction[] = []
  if (canResult) {
    actions.push({ label: t('certificate.result.action'), icon: 'pi pi-pencil', tooltip: true, onClick: onResult })
  }
  if (canRemove) {
    actions.push({
      label: t('operation.enrollment.remove'),
      icon: 'pi pi-times',
      tooltip: true,
      severity: 'danger',
      disabled: removing,
      onClick: onRemove,
    })
  }

  return <RowActions actions={actions} collapsed={collapsed} />
}
