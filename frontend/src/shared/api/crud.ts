import { api } from './axios'

/** Funções axios CRUD por recurso REST. Payload `unknown`: quando é FormData,
 * o axios negocia multipart sozinho; senão vai como JSON. Isso só vale porque
 * a instância em `axios.ts` NÃO fixa um Content-Type default — se fixasse
 * application/json, todo FormData seria serializado como JSON (ver comentário lá). */
export function crudEndpoints<T>(resource: string) {
  return {
    list: () => api.get<T[]>(`/${resource}`).then((r) => r.data),
    get: (id: number | string) => api.get<T>(`/${resource}/${id}`).then((r) => r.data),
    create: (payload: unknown) => api.post<T>(`/${resource}`, payload).then((r) => r.data),
    update: (id: number | string, payload: unknown) =>
      api.put<T>(`/${resource}/${id}`, payload).then((r) => r.data),
    remove: (id: number | string) => api.delete(`/${resource}/${id}`).then(() => undefined),
  }
}
