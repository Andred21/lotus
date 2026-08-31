import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppButton, AppPassword, FormErrorBanner, FormField, pageTitleClass } from '@shared/ui'
import { useSetPassword } from '../../hooks/useSetPassword'
import type { PasswordFlow } from '../../api/passwordApi'

export function SetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const flow: PasswordFlow = params.get('flow') === 'reset' ? 'reset' : 'invite'

  const {
    password, setPassword, confirmation, setConfirmation,
    submit, isSubmitting, succeeded, fieldErrors, generalError, tokenRejected,
  } = useSetPassword(token, flow, email)

  // Link vencido não deixa o usuário preso: a saída é pedir outro.
  if (tokenRejected) {
    return (
      <main className="flex flex-col gap-4 w-full max-w-sm mx-auto p-8 text-left">
        <h1 className={pageTitleClass} style={{ color: 'var(--text-color)' }}>
          {t('password.expired')}
        </h1>
        <AppButton variant="primary" label={t('password.expiredAction')} onClick={() => navigate('/recuperar-clave')} />
      </main>
    )
  }

  if (succeeded) {
    return (
      <main className="flex flex-col gap-4 w-full max-w-sm mx-auto p-8 text-left">
        <h1 className={pageTitleClass} style={{ color: 'var(--text-color)' }}>
          {t('password.success')}
        </h1>
        <AppButton variant="primary" label={t('password.successAction')} onClick={() => navigate('/login')} />
      </main>
    )
  }

  return (
    <main className="p-8">
      <form
        onSubmit={(e) => { e.preventDefault(); submit() }}
        className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
      >
        <div>
          <h1 className={pageTitleClass} style={{ color: 'var(--text-color)' }}>
            {t('password.title')}
          </h1>
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('password.subtitle')}</p>
        </div>

        {/* `generalError` primeiro: 429/419/500 não trazem `errors`, então os
            dois nunca coexistem — e sem ele a falha de transporte ficaria muda. */}
        <FormErrorBanner message={generalError ?? fieldErrors?.email?.[0] ?? null} variant="inline" />

        <FormField label={t('password.newPassword')} error={fieldErrors?.password?.[0]}>
          <AppPassword
            leftIcon="pi pi-lock"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <FormField label={t('password.confirmation')}>
          <AppPassword
            leftIcon="pi pi-lock"
            value={confirmation}
            autoComplete="new-password"
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </FormField>

        <AppButton variant="primary" type="submit" label={t('password.submit')} loading={isSubmitting} />
      </form>
    </main>
  )
}
