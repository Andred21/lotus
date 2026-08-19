import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppButton, AppPassword, FormErrorBanner } from '@shared/ui'
import { dangerText } from '@shared/styles/tokens'
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
        <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
          {t('password.expired')}
        </h1>
        <AppButton label={t('password.expiredAction')} onClick={() => navigate('/recuperar-clave')} />
      </main>
    )
  }

  if (succeeded) {
    return (
      <main className="flex flex-col gap-4 w-full max-w-sm mx-auto p-8 text-left">
        <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
          {t('password.success')}
        </h1>
        <AppButton label={t('password.successAction')} onClick={() => navigate('/login')} />
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
          <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
            {t('password.title')}
          </h1>
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('password.subtitle')}</p>
        </div>

        {/* `generalError` primeiro: 429/419/500 não trazem `errors`, então os
            dois nunca coexistem — e sem ele a falha de transporte ficaria muda. */}
        <FormErrorBanner message={generalError ?? fieldErrors?.email?.[0] ?? null} variant="inline" />

        {/* Rótulo por htmlFor + `inputId`, nunca embrulhando o campo: o olho do
            AppPassword tem nome acessível próprio e seria somado ao do input
            (UI-03). `inputId` é o que o PrimeReact repassa ao <input>. */}
        <div className="flex flex-col gap-1">
          <label htmlFor="set-password" className="font-medium" style={{ color: 'var(--text-color)' }}>
            {t('password.newPassword')}
          </label>
          <AppPassword
            inputId="set-password"
            leftIcon="pi pi-lock"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!fieldErrors?.password}
            aria-invalid={!!fieldErrors?.password}
            aria-describedby={fieldErrors?.password ? 'set-password-error' : undefined}
          />
          {fieldErrors?.password && (
            <small id="set-password-error" style={{ color: dangerText }}>{fieldErrors.password[0]}</small>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="set-password-confirmation" className="font-medium" style={{ color: 'var(--text-color)' }}>
            {t('password.confirmation')}
          </label>
          <AppPassword
            inputId="set-password-confirmation"
            leftIcon="pi pi-lock"
            value={confirmation}
            autoComplete="new-password"
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>

        <AppButton type="submit" label={t('password.submit')} loading={isSubmitting} />
      </form>
    </main>
  )
}
