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
    tokenRejected,
  }
}
