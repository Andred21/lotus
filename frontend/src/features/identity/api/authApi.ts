import { api } from '@shared/api/axios'
import { initCsrf } from '@shared/api/csrf'
import type { SessionUser } from '../types'

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
