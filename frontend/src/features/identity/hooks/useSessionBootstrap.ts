import { useEffect } from 'react'
import { useMe } from '../api/useMe'
import { useSessionStore } from '../stores/sessionStore'
import type { SessionStatus } from '../stores/sessionStore'

/**
 * Resolve a sessão no boot: consulta GET /me e popula o sessionStore
 * (setUser em sucesso, clear em 401/erro). Retorna o status atual.
 *
 * A regra de sessão vive na feature identity; a camada app só monta e decide
 * o que renderizar a partir do status (ver app/SessionBootstrap).
 */
export function useSessionBootstrap(): SessionStatus {
  const { data, isError, isSuccess } = useMe()
  const setUser = useSessionStore((s) => s.setUser)
  const clear = useSessionStore((s) => s.clear)
  const status = useSessionStore((s) => s.status)

  useEffect(() => {
    if (isSuccess && data) setUser(data)
    else if (isError) clear()
  }, [isSuccess, isError, data, setUser, clear])

  return status
}
