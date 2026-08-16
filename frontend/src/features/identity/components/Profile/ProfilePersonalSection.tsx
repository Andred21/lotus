import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppCard,
  AppInputText,
  FormErrorBanner,
  FormErrorSummary,
  FormField,
  FormSection,
  useToast,
} from '@shared/ui'
import type { ProfileData } from '@shared/types/generated'
import { useProfileForm } from '../../hooks/useProfileForm'

/**
 * Coluna direita: exatamente o que é self-service.
 *
 * É `<form>` pelo mesmo motivo do irmão `ProfileSecuritySection`: sem ele o
 * Enter não envia e o preenchimento automático do navegador não tem onde se
 * pendurar (UI-05 do review de 2026-08-16).
 */
export function ProfilePersonalSection({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { form, set, submit, pending, fieldErrors, generalError } = useProfileForm(profile, () =>
    toast.success(t('profile.personal.saved')),
  )

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.personal.title')} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="mt-3 flex flex-col gap-3"
      >
        <FormErrorBanner message={generalError} />
        <FormErrorSummary errors={fieldErrors} mapped={['name', 'phone']} />

        <FormField label={t('profile.personal.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText
            className="w-full"
            autoComplete="name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>

        <FormField label={t('profile.personal.phone')} error={fieldErrors?.phone?.[0]}>
          <AppInputText
            className="w-full"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </FormField>

        <div>
          <AppButton
            type="submit"
            label={t('profile.personal.save')}
            icon="pi pi-check"
            loading={pending}
          />
        </div>
      </form>
    </AppCard>
  )
}
