import { api } from './axios'

/**
 * Inicializa o cookie CSRF do Sanctum (SPA mode).
 * Deve ser chamada uma vez antes do primeiro POST autenticado
 * (login) para que o Sanctum valide o header X-XSRF-TOKEN.
 *
 * O Axios (withXSRFToken) lê o cookie XSRF-TOKEN resultante
 * e o injeta automaticamente nas requisições seguintes.
 */
export async function initCsrf(): Promise<void> {
  await api.get('/sanctum/csrf-cookie')
}