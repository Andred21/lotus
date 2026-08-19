import { useState } from 'react'
import { useSetPasswordMutation, type PasswordFlow } from '../api/passwordApi'

/**
 * Definir a senha pela tela pública. Serve o primeiro acesso e a recuperação:
 * o `flow` (que vem do link do e-mail) escolhe o endpoint, porque o token de
 * cada fluxo é validado por um broker diferente.
 */
export function useSetPassword(token: string, flow: PasswordFlow, email: string) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const mutation = useSetPasswordMutation(flow)

  const fieldErrors = mutation.error?.errors ?? null
  const tokenRejected = Boolean(fieldErrors?.token)
  // 429 (a rota é throttle:6,1), 419 (CSRF) e 500 não trazem `errors`: sem
  // isto o botão para de girar e a tela não diz nada. Mesmo molde do
  // `useForgotPassword` — o hook irmão da mesma tela.
  const generalError =
    mutation.error && !mutation.error.errors ? mutation.error.detail : null

  function submit() {
    mutation.mutate({ token, email, password, password_confirmation: confirmation })
  }

  return {
    password,
    setPassword,
    confirmation,
    setConfirmation,
    submit,
    isSubmitting: mutation.isPending,
    succeeded: mutation.isSuccess,
    fieldErrors,
    generalError,
    tokenRejected,
  }
}
