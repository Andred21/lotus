import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSessionStore } from '@shared/stores/sessionStore'

export function LoginRoute() {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()
  // O destino é o `from` que o `ProtectedRoute` guardou (`pathname + search`),
  // não "/": o login grava a sessão ANTES de o `navigate(from)` dele terminar,
  // este guard re-renderiza como "já autenticado" e, apontando para "/", sua
  // navegação vencia a do formulário — a volta da sessão expirada caía no
  // painel e perdia a tela e a aba em que o usuário estava.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (status === 'authenticated') return <Navigate to={from} replace />
  return <Outlet />
}
