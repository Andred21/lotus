import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { initCsrf } from '@shared/api/csrf'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { SessionUser } from '@shared/stores/sessionStore'

// ---- chamadas ----

export async function login(email: string, password: string): Promise<SessionUser> {
  await initCsrf()
  const { data } = await api.post<SessionUser>('/api/login', { email, password })
  return data
}

export async function logout(): Promise<void> {
  await api.post('/api/logout')
}

export async function fetchMe(): Promise<SessionUser> {
  const { data } = await api.get<SessionUser>('/api/me')
  return data
}

// ---- hooks ----

interface LoginVars {
  email: string
  password: string
}

export function useLogin() {
  const setUser = useSessionStore((s) => s.setUser)

  return useMutation<SessionUser, ProblemDetails, LoginVars>({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: (user) => setUser(user),
  })
}

export function useLogout() {
  const clear = useSessionStore((s) => s.clear)

  return useMutation<void, ProblemDetails, void>({
    mutationFn: () => logout(),
    onSuccess: () => clear(),
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false, // 401 no boot = deslogado, não re-tentar
    staleTime: Infinity,
  })
}
