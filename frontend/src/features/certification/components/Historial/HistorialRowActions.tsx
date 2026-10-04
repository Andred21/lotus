import { useTranslation } from 'react-i18next'
import { RowActions, type RowAction } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'

/**
 * As ações da linha do Historial: Ver sempre; Revocar no vigente e no por
 * vencer; Reemitir no revocado. Eram três botões de texto numa coluna presa de
 * 16rem — em 390x844 ela cobria 120px do aluno (item 23, `D-65`). Viram ícones
 * com o mesmo rótulo como nome acessível e dica, e colapsam abaixo de `sm`.
 *
 * As permissões chegam como booleanos do `useHistorial`, que é quem as lê.
 */
export function HistorialRowActions({
  certificate,
  canRevoke,
  canReissue,
  onView,
  onRevoke,
  onReissue,
  collapsed,
}: {
  certificate: CertificateData
  canRevoke: boolean
  canReissue: boolean
  onView: (c: CertificateData) => void
  onRevoke: (c: CertificateData) => void
  onReissue: (c: CertificateData) => void
  collapsed: boolean
}) {
  const { t } = useTranslation()
  const status = certificate.display_status

  const actions: RowAction[] = [
    { label: t('certificate.view'), icon: 'pi pi-eye', tooltip: true, onClick: () => onView(certificate) },
  ]
  if (canRevoke && (status === 'vigente' || status === 'por_vencer')) {
    actions.push({ label: t('certificate.revoke'), icon: 'pi pi-ban', tooltip: true, onClick: () => onRevoke(certificate) })
  }
  if (canReissue && status === 'revocado') {
    actions.push({
      label: t('certificate.reissue'),
      icon: 'pi pi-replay',
      tooltip: true,
      onClick: () => onReissue(certificate),
    })
  }

  return <RowActions actions={actions} collapsed={collapsed} />
}
