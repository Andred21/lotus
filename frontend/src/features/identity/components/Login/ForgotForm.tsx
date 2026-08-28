import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppButton, AppInputText, FormErrorBanner, pageTitleClass } from '@shared/ui'
import { dangerText } from '@shared/styles/tokens'
import { useForgotPassword } from '../../hooks/useForgotPassword'

interface Props {
  email: string
  onEmailChange: (value: string) => void
  /** Só na TROCA de modo: abrir /recuperar-clave direto não rouba o foco. */
  autoFocusTitle: boolean
}

export function ForgotForm({ email, onEmailChange, autoFocusTitle }: Props) {
  const { t } = useTranslation()
  const { submit, isSubmitting, sent, fieldErrors, generalError } = useForgotPassword(email)
  const titulo = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (autoFocusTitle) titulo.current?.focus()
  }, [autoFocusTitle])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
    >
      <div>
        {/* `tabIndex={-1}` existe só para o foco programático da troca de modo:
            a URL muda sem trocar de página, e o React Router não move foco. */}
        <h1
          ref={titulo}
          tabIndex={-1}
          className={pageTitleClass}
          style={{ color: 'var(--text-color)' }}
        >
          {t('password.forgotTitle')}
        </h1>
        {!sent && (
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('password.forgotSubtitle')}</p>
        )}
      </div>

      {/* Mensagem IDÊNTICA exista ou não a conta: a tela não pode desmentir a
          resposta genérica do backend e virar enumerador de usuários.
          O container do `aria-live` fica nos DOIS estados: container que nasce
          junto com o texto não anuncia nada. */}
      <div aria-live="polite" style={{ color: 'var(--text-color-secondary)' }}>
        {sent ? t('password.forgotSent') : null}
      </div>

      {!sent && (
        <>
          <FormErrorBanner message={generalError} variant="inline" />

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
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              invalid={!!fieldErrors?.email}
              aria-invalid={!!fieldErrors?.email}
              aria-describedby={fieldErrors?.email ? 'forgot-email-error' : undefined}
            />
            {fieldErrors?.email && (
              <small id="forgot-email-error" style={{ color: dangerText }}>{fieldErrors.email[0]}</small>
            )}
          </div>
          <AppButton type="submit" label={t('password.forgotSubmit')} loading={isSubmitting} />
        </>
      )}

      <Link to="/login" className="text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('password.backToLogin')}
      </Link>
    </form>
  )
}
