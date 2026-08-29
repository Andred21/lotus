import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppCard,
  AppInputText,
  FormErrorBanner,
  FormErrorSummary,
  FormField,
  FormSection,
  technicalDataClass,
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
      <FormSection title={t('profile.personal.title')} as="h2" />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="mt-3 flex flex-col gap-3"
      >
        <FormErrorBanner message={generalError} />
        <FormErrorSummary errors={fieldErrors} mapped={['name', 'phone']} />

        {/* `disabled` durante o PUT (spec §7). Sem ele o campo aceita digitação
            que a requisição em voo NÃO leva: o toast de sucesso aparecia sobre
            um texto na tela que nunca chegou ao servidor, e o refetch só o
            desmentia depois. */}
        <FormField label={t('profile.personal.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText
            className="w-full"
            autoComplete="name"
            value={form.name}
            disabled={pending}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>

        <FormField label={t('profile.personal.phone')} error={fieldErrors?.phone?.[0]}>
          {/* `technicalDataClass` (D-29): único sítio da decisão que pousa num
              controle EDITÁVEL, e não num valor de leitura — a auditoria o cita
              explicitamente ("vale também para telefone"). */}
          <AppInputText
            className={`w-full ${technicalDataClass}`}
            autoComplete="tel"
            value={form.phone}
            disabled={pending}
            onChange={(e) => set('phone', e.target.value)}
          />
        </FormField>

        <div>
          <AppButton
            variant="primary"
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
