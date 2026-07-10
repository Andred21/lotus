import { useMutation } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useSessionStore } from '@shared/stores/sessionStore'
import { logout } from './authApi'

export function useLogout() {
  const clear = useSessionStore((s) => s.clear)

  return useMutation<void, ProblemDetails, void>({
    mutationFn: () => logout(),
    onSuccess: () => clear(),
  })
}
