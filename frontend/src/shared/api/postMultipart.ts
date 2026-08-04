import { api } from './axios'

/** Campos de um upload simples: texto e um arquivo. `undefined` = não enviar. */
export type MultipartFields = Record<string, string | File | undefined>

/**
 * Único ponto que monta multipart no app. Existe para a lição 6 morar em um
 * lugar só: o axios NÃO fixa `Content-Type` (`shared/api/axios.ts`), então o
 * FormData vira multipart+boundary sozinho. Fixar `application/json` faz o
 * `transformRequest` serializar o FormData, cada `File` vira `{}` e o upload
 * chega VAZIO com 201/204 silencioso — em caminho de documento com peso legal.
 *
 * Por isso a chamada ao axios não recebe terceiro argumento: não há onde
 * encaixar um header.
 *
 * Cobre só o payload plano. `useRedatorForm` monta array (`course_ids[]`) e
 * chave polimórfica (`documents[type]`) e fica fora de propósito (spec D11) —
 * generalizar aqui seria trazer forma de domínio para o transporte.
 */
export function postMultipart<T>(url: string, fields: MultipartFields): Promise<T> {
  const body = new FormData()

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) body.append(key, value)
  }

  return api.post<T>(url, body).then((r) => r.data)
}
