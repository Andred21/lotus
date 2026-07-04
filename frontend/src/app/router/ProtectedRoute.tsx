import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSessionStore } from '@features/identity/stores/sessionStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
