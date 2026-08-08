import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppSkeleton, AppErrorState } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import type { ProblemDetails } from '@shared/api/axios'
import { formatDate } from '@shared/lib'
import { useCertificatePdfOpener } from '../../hooks/useCertificatePdfOpener'

type Props = {
  /** Sempre conhecido de imediato (vem da linha ou da resposta do POST de
   * emissão) — o PDF abre pelo id, sem depender do `certificate` ter chegado. */
  certificateId: number
  /** `null` enquanto `loading`/`error`; carregado pela query pontual
   * (`useCertificate`) exceto logo após emitir, quando a própria mutação já
   * semeou o cache — ver `certificatesApi.ts`. */
  certificate: CertificateData | null
  loading: boolean
  error: ProblemDetails | null
  onRetry: () => void
  studentName: string
  courseName: string
  onHide: () => void
}

/** Cartão do certificado recém-emitido (ou reaberto via `Ver` numa linha já
 * emitida — mesmo componente nos dois casos). O `Ver` busca por id
 * (`useCertificate` em `useEmissionPanelState`), então este diálogo precisa
 * dos três estados de uma query: carregando, erro (com retry, não clique
 * morto) e carregado — nunca "nada aparece" num sistema de arquivo legal. */
export function IssuedDialog({
  certificateId,
  certificate,
  loading,
  error,
  onRetry,
  studentName,
  courseName,
  onHide,
}: Props) {
  const { t } = useTranslation()
  const pdf = useCertificatePdfOpener(certificateId)

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
    <AppDialog visible header={t('certificate.issuedTitle')} onHide={onHide} footer={footer}>
      {loading && <AppSkeleton height="10rem" />}

      {error && (
        <AppErrorState
          title={t('common.loadError')}
          detail={error.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={onRetry}
        />
      )}

      {certificate && (
        <div className="space-y-4">
          <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--surface-border)' }}>
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-color-secondary)' }}
            >
              {t('certificate.issuedHeading')}
            </p>
            <p className="mt-2 text-lg font-semibold">{studentName}</p>
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{courseName}</p>
            <p className="mt-3 font-mono text-base">{certificate.codigo}</p>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('certificate.issuedBy', { date: formatDate(new Date(certificate.created_at)) })}
            </p>
          </div>

          {(pdf.popupBlocked || pdf.message) && (
            <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}>
              {pdf.popupBlocked ? t('certificate.popupBlocked') : pdf.message}
            </p>
          )}
        </div>
      )}
    </AppDialog>
  )
}
