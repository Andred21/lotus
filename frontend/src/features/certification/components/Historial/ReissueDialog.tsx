import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppSkeleton, AppErrorState, AppTag } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import type { ProblemDetails } from '@shared/api/axios'
import { ConfirmIssueDialog } from '../Emission/ConfirmIssueDialog'
import type { ReissueTarget } from '../../hooks/useHistorial'
import { loadErrorHint, screenDetail } from '@shared/lib'

type Props = {
  /** Matrícula/turma achada no painel de emissão (`useHistorial.findReissueTarget`),
   * ou `null` quando a turma não aparece mais nele. */
  target: ReissueTarget | null
  panelLoading: boolean
  panelError: ProblemDetails | null
  onRetryPanel: () => void
  onHide: () => void
  onIssued: (certificate: CertificateData) => void
}

/** Reemitir abre o MESMO `ConfirmIssueDialog` da emissão individual (Task 6) —
 * só quando a matrícula segue emissível. Revogar libera a matrícula de novo
 * (porta 3 do `CertificateEligibility` não conta certificado revogado como
 * vigente), mas a turma pode ter deixado de ser emissível por outro motivo
 * (`emission_blocked`, ou nem aparecer mais no painel); aí o diálogo mostra o
 * bloqueio em vez do formulário de confirmação. */
export function ReissueDialog({
  target,
  panelLoading,
  panelError,
  onRetryPanel,
  onHide,
  onIssued,
}: Props) {
  const { t } = useTranslation()

  if (panelLoading) {
    return (
      <AppDialog visible header={t('certificate.reissue')} onHide={onHide}>
        <AppSkeleton height="10rem" />
      </AppDialog>
    )
  }

  if (panelError) {
    return (
      <AppDialog visible header={t('certificate.reissue')} onHide={onHide}>
        <AppErrorState
          title={t('common.loadError')}
          detail={screenDetail(panelError) ?? t(loadErrorHint(panelError))}
          retryLabel={t('common.retry')}
          onRetry={onRetryPanel}
        />
      </AppDialog>
    )
  }

  if (!target || target.turma.emission_blocked !== null) {
    const footer = (
      <div className="flex justify-end">
        <AppButton label={t('common.close')} text onClick={onHide} />
      </div>
    )
    return (
      <AppDialog visible header={t('certificate.reissue')} onHide={onHide} footer={footer}>
        <AppTag
          severity="warning"
          value={
            target?.turma.emission_blocked
              ? t(`certificate.blocked.${target.turma.emission_blocked}`)
              : t('certificate.reissueUnavailable')
          }
        />
      </AppDialog>
    )
  }

  return (
    <ConfirmIssueDialog enrollment={target.enrollment} turma={target.turma} onHide={onHide} onIssued={onIssued} />
  )
}
