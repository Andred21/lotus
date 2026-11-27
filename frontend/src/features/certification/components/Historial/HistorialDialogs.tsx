import { useTranslation } from 'react-i18next'
import { useToast } from '@shared/ui'
import type { useHistorial } from '../../hooks/useHistorial'
import { CertificateViewDialog } from './CertificateViewDialog'
import { RevokeDialog } from './RevokeDialog'
import { ReissueDialog } from './ReissueDialog'

/**
 * Os três diálogos da aba Historial — ver, revogar e reemitir.
 *
 * Saíram da `HistorialTable` porque as seis larguras de coluna desta task não
 * cabiam no `max-lines: 150` do arquivo, que já estava exatamente no teto. O
 * corte segue o molde do `BudgetOverlays`: recebe o objeto do hook inteiro, não
 * dezesseis props de repasse — nenhum estado novo nasce aqui.
 */
export function HistorialDialogs({ h }: { h: ReturnType<typeof useHistorial> }) {
  const { t } = useTranslation()
  const toast = useToast()

  return (
    <>
      {h.viewingCertificateId !== null && (
        <CertificateViewDialog
          certificateId={h.viewingCertificateId}
          certificate={h.viewingCertificate}
          loading={h.viewingCertificateLoading}
          error={h.viewingCertificateError}
          onRetry={h.reloadViewingCertificate}
          onHide={() => h.setViewingCertificateId(null)}
        />
      )}

      {h.revoking && (
        <RevokeDialog
          certificate={h.revoking}
          onHide={() => h.setRevoking(null)}
          // Revogar é irreversível e de peso legal: o sucesso é dito (C-5), e não
          // só deduzido do diálogo que fecha.
          onRevoked={() => {
            toast.success(t('certificate.revokedToast'))
            h.setRevoking(null)
          }}
        />
      )}

      {h.reissuing && (
        <ReissueDialog
          target={h.findReissueTarget(h.reissuing)}
          panelLoading={h.reissuePanelLoading}
          panelError={h.reissuePanelError}
          onRetryPanel={h.reissuePanelReload}
          onHide={() => h.setReissuing(null)}
          onIssued={h.openIssuedCertificate}
        />
      )}
    </>
  )
}
