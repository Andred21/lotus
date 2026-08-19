import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppButton, AppInputText } from '@shared/ui'
import { useForgotPassword } from '../../hooks/useForgotPassword'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { email, setEmail, submit, isSubmitting, sent } = useForgotPassword()

  return (
    <main className="p-8">
      <form
        onSubmit={(e) => { e.preventDefault(); submit() }}
        className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
      >
        <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
          {t('password.forgotTitle')}
        </h1>

        {/* Mensagem IDÊNTICA exista ou não a conta: a tela não pode desmentir a
            resposta genérica do backend e virar enumerador de usuários. */}
        {sent ? (
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('password.forgotSent')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="forgot-email" className="font-medium" style={{ color: 'var(--text-color)' }}>
                {t('login.email')}
              </label>
              <AppInputText
                id="forgot-email"
                type="email"
                leftIcon="pi pi-envelope"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <AppButton type="submit" label={t('password.forgotSubmit')} loading={isSubmitting} />
          </>
        )}

        <Link to="/login" className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('password.backToLogin')}
        </Link>
      </form>
    </main>
  )
}
