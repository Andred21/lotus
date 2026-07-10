import { api } from './axios'

/** Funções axios CRUD por recurso REST. Payload `unknown`: quando é FormData,
 * o axios negocia multipart sozinho; senão vai como JSON. Isso só vale porque
 * a instância em `axios.ts` NÃO fixa um Content-Type default — se fixasse
 * application/json, todo FormData seria serializado como JSON (ver comentário lá). */
export function crudEndpoints<T>(resource: string) {
  // `VITE_API_URL` é a raiz do host (o `/sanctum/csrf-cookie` do Sanctum não
  // mora sob `/api`), então o prefixo entra aqui — mesma convenção do authApi.
  const base = `/api/${resource}`

  return {
    list: () => api.get<T[]>(base).then((r) => r.data),
    get: (id: number | string) => api.get<T>(`${base}/${id}`).then((r) => r.data),
    create: (payload: unknown) => api.post<T>(base, payload).then((r) => r.data),
    update: (id: number | string, payload: unknown) =>
      api.put<T>(`${base}/${id}`, payload).then((r) => r.data),
    remove: (id: number | string) => api.delete(`${base}/${id}`).then(() => undefined),
  }
}
