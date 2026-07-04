import { useMutation } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useSessionStore } from '../stores/sessionStore'
import { login } from './authApi'

interface LoginVars {
  email: string
  password: string
}

export function useLogin() {
  const setUser = useSessionStore((s) => s.setUser)

  return useMutation<Awaited<ReturnType<typeof login>>, ProblemDetails, LoginVars>({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: (user) => setUser(user),
  })
}
