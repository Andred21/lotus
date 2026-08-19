import { useState } from 'react'
import { ForgotForm } from '../Login/ForgotForm'

/** Ponte transitória: a rota `/recuperar-clave` muda de dono na task do router
 *  e este arquivo é apagado lá. Existe para a árvore compilar neste commit. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  return (
    <main className="p-8">
      <ForgotForm email={email} onEmailChange={setEmail} autoFocusTitle={false} />
    </main>
  )
}
