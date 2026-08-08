import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import { formatDate } from '@shared/lib'
import { useCertificatePdfOpener } from '../../hooks/useCertificatePdfOpener'

type Props = {
  certificate: CertificateData
  studentName: string
  courseName: string
  onHide: () => void
}

/** Cartão do certificado recém-emitido (ou reaberto via `Ver` numa linha já
 * emitida — mesmo componente, `certificate` completo nos dois casos). */
export function IssuedDialog({ certificate, studentName, courseName, onHide }: Props) {
  const { t } = useTranslation()
  const pdf = useCertificatePdfOpener(certificate.id)

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.close')} outlined onClick={onHide} />
      <AppButton
        label={t('certificate.downloadPdf')}
        icon="pi pi-download"
        loading={pdf.pending}
        onClick={pdf.open}
      />
    </div>
  )

  return (
    <AppDialog visible header={t('certificate.issuedTitle')} onHide={onHide} footer={footer}>
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
    </AppDialog>
  )
}
