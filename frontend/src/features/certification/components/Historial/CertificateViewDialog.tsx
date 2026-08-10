import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppSkeleton, AppErrorState, AppTag, AppInputText, FormField } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import type { ProblemDetails } from '@shared/api/axios'
import { formatDate } from '@shared/lib'
import { useCertificatePdfOpener } from '../../hooks/useCertificatePdfOpener'
import { certStatus, STATUS_SEVERITY } from '../../lib/certStatus'
import { CertificateIdentityFields } from './CertificateIdentityFields'

type Props = {
  /** Sempre conhecido de imediato (vem da linha clicada) — o PDF abre pelo id,
   * sem depender do `certificate` ter chegado. */
  certificateId: number
  /** `null` enquanto `loading`/`error`. Vem de `useCertificate` (pontual, em
   * `useHistorial`) e não da linha da lista: um certificado visto e depois
   * revogado precisa refletir a revogação assim que `useRevokeCertificate`
   * invalida `detailKey(certificateId)` — a lista some/atualiza sozinha, mas
   * este diálogo fica aberto por cima dela. */
  certificate: CertificateData | null
  loading: boolean
  error: ProblemDetails | null
  onRetry: () => void
  onHide: () => void
}

/** Detalhe de UM certificado do Historial: resumo do snapshot + Descargar
 * PDF. Mesma forma de diálogo do `IssuedDialog` (loading/error/dado), aqui com
 * mais campos porque o Historial já mostra o certificado emitido por
 * completo, revogado ou não. */
export function CertificateViewDialog({ certificateId, certificate, loading, error, onRetry, onHide }: Props) {
  const { t } = useTranslation()
  const pdf = useCertificatePdfOpener(certificateId)
  const status = certificate ? certStatus(certificate) : null

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.close')} outlined onClick={onHide} />
      {certificate && (
        <AppButton
          label={t('certificate.downloadPdf')}
          icon="pi pi-download"
          loading={pdf.pending}
          onClick={pdf.open}
        />
      )}
    </div>
  )

  return (
    <AppDialog visible header={t('certificate.viewTitle')} onHide={onHide} footer={footer}>
      {loading && <AppSkeleton height="14rem" />}

      {error && (
        <AppErrorState
          title={t('common.loadError')}
          detail={error.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={onRetry}
        />
      )}

      {certificate && status && (
        <div className="space-y-4">
          <CertificateIdentityFields certificate={certificate} />
          <FormField label={t('certificate.fieldRut')}>
            <AppInputText value={certificate.snapshot.aluno.rut ?? '—'} disabled readOnly />
          </FormField>
          <FormField label={t('certificate.fieldCurso')}>
            <AppInputText value={certificate.snapshot.curso.name} disabled readOnly />
          </FormField>
          <FormField label={t('certificate.fieldVigencia')}>
            <AppInputText
              value={
                certificate.valido_ate
                  ? formatDate(new Date(`${certificate.valido_ate}T00:00:00`))
                  : t('certificate.vigenciaIndefinida')
              }
              disabled
              readOnly
            />
          </FormField>
          <FormField label={t('certificate.fieldEstado')}>
            <AppTag severity={STATUS_SEVERITY[status]} value={t(`certificate.status.${status}`)} />
          </FormField>

          {status === 'revocado' && (
            <>
              <FormField label={t('certificate.fieldRevokedAt')}>
                <AppInputText
                  value={certificate.revoked_at ? formatDate(new Date(certificate.revoked_at)) : '—'}
                  disabled
                  readOnly
                />
              </FormField>
              <FormField label={t('certificate.revokeReason')}>
                <AppInputText value={certificate.revocation_reason ?? '—'} disabled readOnly />
              </FormField>
            </>
          )}

          {pdf.popupBlocked || pdf.message ? (
            <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}>
              {pdf.popupBlocked ? t('certificate.popupBlocked') : pdf.message}
            </p>
          ) : null}
        </div>
      )}
    </AppDialog>
  )
}
