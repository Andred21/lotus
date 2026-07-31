import { api } from './axios'

/** Os 4 recursos que têm foto. Fechado de propósito: recurso novo com foto
 * exige rota nova no backend, então a lista é a documentação de quem já tem. */
export type PhotoResource = 'users' | 'redatores' | 'students' | 'clients'

/**
 * Cliente das rotas nested de foto (spec D1). Uma rota por entidade, cada uma
 * sob a permissão do seu módulo — por isso o recurso é parâmetro, não um
 * endpoint único.
 *
 * O axios NÃO fixa Content-Type (`shared/api/axios.ts`): o FormData vira
 * multipart+boundary sozinho. Fixar json aqui faria o File virar `{}` e o
 * upload chegar vazio com 204 silencioso.
 */
export function photoResource(resource: PhotoResource) {
  return {
    upload: (id: number, file: File): Promise<void> => {
      const fd = new FormData()
      fd.append('photo', file)

      return api.post(`/api/${resource}/${id}/photo`, fd).then(() => undefined)
    },
    remove: (id: number): Promise<void> =>
      api.delete(`/api/${resource}/${id}/photo`).then(() => undefined),
  }
}
