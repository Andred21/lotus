import { useNavigate } from 'react-router-dom'
import { AppButton } from '@shared/ui'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { useLogout } from '@features/identity/api/useLogout'

// Placeholder pós-login (stand-in da futura dashboard).
export function HomePage() {
  const user = useSessionStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl">Bienvenido, {user?.name}</h1>
      <AppButton label="Cerrar sesión" onClick={handleLogout} loading={logout.isPending} />
    </div>
  )
}
