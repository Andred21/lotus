import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppDetailSkeleton,
  AppErrorState,
  AppInputText,
  FormErrorBanner,
  FormErrorSummary,
  useFormField,
  useToast,
} from '@shared/ui'
import { loadMessage } from '@shared/lib'
import { useCertificateSettingsForm } from '../../hooks/useCertificateSettingsForm'
import { ManagerSignatureField } from './ManagerSignatureField'

/**
 * Configuración › Certificados (spec D3): quem assina como gerente em TODO
 * certificado. Vale também para os já emitidos (D5), e a ajuda diz isso.
 */
export function CertificateSettingsPanel() {
  const { t } = useTranslation()
  const toast = useToast()
  const f = useCertificateSettingsForm(() => toast.success(t('certificateSettings.saved')))
  const { state, submit, saving, fieldErrors, generalError } = f
  const campo = useFormField(f)

  if (state.isLoading) return <AppDetailSkeleton />

  if (state.failedWithoutData) {
    return (
      <AppErrorState
        title={t('certificateSettings.loadError')}
        detail={loadMessage(state, t)}
        retryLabel={t('common.retry')}
        onRetry={state.refetch}
      />
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex max-w-xl flex-col gap-4"
    >
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('certificateSettings.help')}
      </p>

      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} mapped={['manager_name', 'manager_title']} />

      <campo.Field name="manager_name" label={t('certificateSettings.managerName')}>
        <AppInputText className="w-full" disabled={saving} />
      </campo.Field>
      <campo.Field name="manager_title" label={t('certificateSettings.managerTitle')}>
        <AppInputText className="w-full" disabled={saving} />
      </campo.Field>

      <ManagerSignatureField control={f.signature} />

      <div>
        <AppButton
          variant="primary"
          type="submit"
          label={t('certificateSettings.save')}
          icon="pi pi-check"
          loading={saving}
        />
      </div>
    </form>
  )
}
