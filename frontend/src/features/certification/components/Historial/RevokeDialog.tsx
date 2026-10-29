import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog, AppTextarea, FormField } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useRevokeCertificate } from '../../api/certificatesApi'
import { CertificateIdentityFields } from './CertificateIdentityFields'

type Props = {
  certificate: CertificateData
  onHide: () => void
  onRevoked: () => void
}

/** Confirmação de revogação — ação irreversível, peso legal (RN de
 * certificação), por isso `danger`. Motivo obrigatório
 * (`RevokeCertificateData::rules()`: `required|string|max:255`); o disable do
 * botão evita a viagem ao backend para o caso óbvio, mas o 422 real (motivo
 * vazio ou too-long) sobe pelo banner igual. */
export function RevokeDialog({ certificate, onHide, onRevoked }: Props) {
  const { t } = useTranslation()
  const revoke = useRevokeCertificate()
  const { fieldErrors, message } = useMutationErrors([revoke.error])
  const [reason, setReason] = useState('')

  const submit = () => {
    if (reason.trim() === '' || revoke.isPending) return
    revoke.mutate({ certificateId: certificate.id, reason }, { onSuccess: onRevoked })
  }

  return (
    <ConfirmDialog
      visible
      severity="danger"
      title={t('certificate.revokeTitle')}
      message={t('certificate.revokeBody')}
      confirmLabel={t('certificate.revokeConfirm')}
      confirmIcon="pi pi-ban"
      confirmDisabled={reason.trim() === ''}
      pending={revoke.isPending}
      error={message}
      onConfirm={submit}
      onCancel={onHide}
    >
      <div className="mt-4 space-y-4">
        <CertificateIdentityFields certificate={certificate} />

        <FormField label={t('certificate.revokeReason')} error={fieldErrors?.reason?.[0]}>
          <AppTextarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoResize className="w-full" />
        </FormField>
      </div>
    </ConfirmDialog>
  )
}
