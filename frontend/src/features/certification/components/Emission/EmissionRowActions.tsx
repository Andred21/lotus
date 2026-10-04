import { useTranslation } from 'react-i18next'
import { RowActions, type RowAction } from '@shared/ui'
import type { EmissionPanelEnrollmentData } from '@shared/types/generated'
import { rowCertKind } from '../../lib/certStatus'

/**
 * A ação da linha da Emisión — uma só por linha: Ver no emitido, Emitir no
 * aprovado sem certificado, nada no resto. Era botão de texto numa presa de
 * 8rem (item 23, `D-65`); vira ícone com o rótulo como nome acessível e dica.
 *
 * O "Emitir" apagado pela turma bloqueada continua apontando para a tag que
 * explica o bloqueio (`describedBy`, f3 UI-03).
 */
export function EmissionRowActions({
  enrollment,
  blocked,
  blockedReasonId,
  onEmit,
  onView,
  collapsed,
}: {
  enrollment: EmissionPanelEnrollmentData
  blocked: boolean
  blockedReasonId?: string
  onEmit: (e: EmissionPanelEnrollmentData) => void
  onView: (e: EmissionPanelEnrollmentData) => void
  collapsed: boolean
}) {
  const { t } = useTranslation()
  const kind = rowCertKind(enrollment)

  const actions: RowAction[] = []
  if (kind === 'emitido') {
    actions.push({ label: t('certificate.view'), icon: 'pi pi-eye', tooltip: true, onClick: () => onView(enrollment) })
  }
  if (kind === 'sin_emitir') {
    actions.push({
      label: t('certificate.emit'),
      icon: 'pi pi-verified',
      tooltip: true,
      disabled: blocked,
      describedBy: blocked ? blockedReasonId : undefined,
      onClick: () => onEmit(enrollment),
    })
  }

  return <RowActions actions={actions} collapsed={collapsed} />
}
