import { useForgotPasswordMutation } from '../api/passwordApi'

/**
 * Pedido de recuperação. O e-mail vem de fora porque ele é compartilhado com o
 * login na mesma tela (`useAuthPanel`) — guardá-lo aqui o mataria na troca de
 * modo, que é justamente o que a tela unificada existe para evitar.
 *
 * `sent` é `isSuccess` e nada mais: a tela mostra a mesma mensagem tendo ou não
 * conta, espelhando a resposta genérica do backend — desmenti-la aqui
 * transformaria a rota em enumerador de usuários.
 *
 * `fieldErrors`/`generalError` expõem a falha do PEDIDO (422 de e-mail
 * malformado, 429 do throttle, 419 de CSRF, 500) — isso não desmente a
 * resposta genérica de cima: uma coisa é "existe conta com este e-mail?"
 * (sempre oculto), outra é "o pedido chegou ao servidor?" (transporte/limite,
 * visível como em qualquer outro formulário da tela).
 */
export function useForgotPassword(email: string) {
  const mutation = useForgotPasswordMutation()

  const fieldErrors = mutation.error?.errors
  const generalError =
    mutation.error && !mutation.error.errors ? mutation.error.detail : null

  return {
    submit: () => mutation.mutate({ email }),
    isSubmitting: mutation.isPending,
    sent: mutation.isSuccess,
    fieldErrors,
    generalError,
  }
}
