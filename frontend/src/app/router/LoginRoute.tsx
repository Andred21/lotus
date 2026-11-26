import { Navigate, Outlet } from 'react-router-dom'
import { useSessionStore } from '@shared/stores/sessionStore'

export function LoginRoute() {
  const status = useSessionStore((s) => s.status)
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
