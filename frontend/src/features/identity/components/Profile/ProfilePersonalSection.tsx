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

/** Coluna direita: exatamente o que é self-service. */
export function ProfilePersonalSection({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { form, set, submit, pending, fieldErrors, generalError } = useProfileForm(profile, () =>
    toast.success(t('profile.personal.saved')),
  )

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.personal.title')} />

      <div className="mt-3 flex flex-col gap-3">
        <FormErrorBanner message={generalError} />
        <FormErrorSummary errors={fieldErrors} mapped={['name', 'phone']} />

        <FormField label={t('profile.personal.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText
            className="w-full"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>

        <FormField label={t('profile.personal.phone')} error={fieldErrors?.phone?.[0]}>
          <AppInputText
            className="w-full"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </FormField>

        <div>
          <AppButton
            label={t('profile.personal.save')}
            icon="pi pi-check"
            loading={pending}
            onClick={() => submit()}
          />
        </div>
      </div>
    </AppCard>
  )
}
