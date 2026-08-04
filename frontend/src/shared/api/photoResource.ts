import { api } from './axios'
import { postMultipart } from './postMultipart'

/** Os 4 recursos que têm foto. Fechado de propósito: recurso novo com foto
 * exige rota nova no backend, então a lista é a documentação de quem já tem. */
export type PhotoResource = 'users' | 'redatores' | 'students' | 'clients'

/**
 * Cliente das rotas nested de foto (spec D1). Uma rota por entidade, cada uma
 * sob a permissão do seu módulo — por isso o recurso é parâmetro, não um
 * endpoint único.
 */
export function photoResource(resource: PhotoResource) {
  return {
    upload: (id: number, file: File): Promise<void> =>
      postMultipart<void>(`/api/${resource}/${id}/photo`, { photo: file }).then(() => undefined),
    remove: (id: number): Promise<void> =>
      api.delete(`/api/${resource}/${id}/photo`).then(() => undefined),
  }
}
