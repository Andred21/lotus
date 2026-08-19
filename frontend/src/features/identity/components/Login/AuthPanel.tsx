import { useAuthPanel } from '../../hooks/useAuthPanel'
import { ForgotForm } from './ForgotForm'
import { LoginForm } from './LoginForm'

/** Login e recuperação são a mesma tela: o painel decide qual formulário está
 *  no ar e é o dono do único estado que atravessa a troca, o e-mail. */
export function AuthPanel() {
  const { mode, email, setEmail, switched } = useAuthPanel()

  return mode === 'forgot' ? (
    <ForgotForm email={email} onEmailChange={setEmail} autoFocusTitle={switched} />
  ) : (
    <LoginForm email={email} onEmailChange={setEmail} autoFocusTitle={switched} />
  )
}
