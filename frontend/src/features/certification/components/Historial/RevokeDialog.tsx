import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppTextarea, AppInputText, FormField, FormErrorBanner } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useRevokeCertificate } from '../../api/certificatesApi'

type Props = {
  certificate: CertificateData
  onHide: () => void
  onRevoked: () => void
}

/** Confirmação de revogação — ação irreversível, peso legal (RN de
 * certificação). Motivo obrigatório (`RevokeCertificateData::rules()`:
 * `required|string|max:255`); o disable do botão evita a viagem ao backend
 * para o caso óbvio, mas o 422 real (motivo vazio ou too-long) sobe pelo
 * banner igual. */
export function RevokeDialog({ certificate, onHide, onRevoked }: Props) {
  const { t } = useTranslation()
  const revoke = useRevokeCertificate()
  const { fieldErrors, message } = useMutationErrors([revoke.error])
  const [reason, setReason] = useState('')

  const submit = () => {
    if (reason.trim() === '' || revoke.isPending) return
    revoke.mutate({ certificateId: certificate.id, reason }, { onSuccess: onRevoked })
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} outlined disabled={revoke.isPending} onClick={onHide} />
      <AppButton
        label={t('certificate.revokeConfirm')}
        icon="pi pi-ban"
        severity="danger"
        disabled={reason.trim() === ''}
        loading={revoke.isPending}
        onClick={submit}
      />
    </div>
  )

  return (
    <AppDialog
      visible
      header={t('certificate.revokeTitle')}
      onHide={onHide}
      footer={footer}
      closable={!revoke.isPending}
    >
      <div className="space-y-4">
        <FormErrorBanner message={message} />
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('certificate.revokeBody')}</p>

        <FormField label={t('certificate.fieldCodigo')}>
          <AppInputText value={certificate.codigo} disabled readOnly />
        </FormField>
        <FormField label={t('certificate.fieldAlumno')}>
          <AppInputText value={certificate.snapshot.aluno.name} disabled readOnly />
        </FormField>

        <FormField label={t('certificate.revokeReason')} error={fieldErrors?.reason?.[0]}>
          <AppTextarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoResize className="w-full" />
        </FormField>
      </div>
    </AppDialog>
  )
}
