import { useState } from 'react'
import { useForgotPasswordMutation } from '../api/passwordApi'

/**
 * Pedido de recuperação. `sent` é `isSuccess` e nada mais: a tela mostra a
 * mesma mensagem tendo ou não conta, espelhando a resposta genérica do
 * backend — desmenti-la aqui transformaria a rota em enumerador de usuários.
 */
export function useForgotPassword() {
  const [email, setEmail] = useState('')
  const mutation = useForgotPasswordMutation()

  return {
    email,
    setEmail,
    submit: () => mutation.mutate({ email }),
    isSubmitting: mutation.isPending,
    sent: mutation.isSuccess,
  }
}
