import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { postMultipart } from '@shared/api/postMultipart'
import type {
  ProfileData,
  ProfilePasswordData,
  ProfileUpdateData,
  RedatorDocumentData,
  RedatorDocumentType,
} from '@shared/types/generated'

/** Perfil próprio. `['me']` é a chave da SESSÃO e continua sendo outra coisa:
 * sessão e perfil têm formas e ciclos de vida diferentes (D4 do bloco 1). */
export const PROFILE_KEY = ['profile'] as const
const SESSION_KEY = ['me'] as const

export function useProfile() {
  return useQuery<ProfileData, ProblemDetails>({
    queryKey: PROFILE_KEY,
    queryFn: () => api.get<ProfileData>('/api/profile').then((r) => r.data),
  })
}

/**
 * Invalida o perfil e, quando o que mudou aparece no shell, também a sessão.
 *
 * `SessionUserData` carrega `name` e `photo_url`, e `useSessionBootstrap` já
 * reage a toda mudança de `data` do `useMe()` chamando `setUser` — é assim que
 * o header atualiza. Escrever no `sessionStore` a partir da tela criaria a
 * segunda fonte manual de verdade que a spec proíbe (D8).
 *
 * Documento e senha NÃO tocam a sessão: invalidar `['me']` ali seria refetch
 * inútil em toda troca de senha.
 */
function useInvalidate(alsoSession: boolean) {
  const qc = useQueryClient()
  return async () => {
    await qc.invalidateQueries({ queryKey: PROFILE_KEY })
    if (alsoSession) await qc.invalidateQueries({ queryKey: SESSION_KEY })
  }
}

export function useUpdateProfile() {
  const invalidate = useInvalidate(true)
  return useMutation<ProfileData, ProblemDetails, ProfileUpdateData>({
    mutationFn: (payload) => api.put<ProfileData>('/api/profile', payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUploadProfilePhoto() {
  const invalidate = useInvalidate(true)
  return useMutation<void, ProblemDetails, File>({
    // Rota singular, sem id: o alvo é sempre `$request->user()`. Por isso este
    // caminho não passa por `photoResource`/`useEntityPhoto`, que montam
    // `/api/<recurso>/<id>/photo` e bufferizam foto de criação (spec D7).
    mutationFn: (photo) => postMultipart<void>('/api/profile/photo', { photo }),
    onSuccess: invalidate,
  })
}

export function useRemoveProfilePhoto() {
  const invalidate = useInvalidate(true)
  return useMutation<void, ProblemDetails, void>({
    mutationFn: () => api.delete('/api/profile/photo').then(() => undefined),
    onSuccess: invalidate,
  })
}

/** 204 e nada a invalidar: a troca de senha não muda leitura nenhuma da tela.
 * A sessão atual segue aberta — só as OUTRAS morrem (D3 do bloco 1). */
export function useChangePassword() {
  return useMutation<void, ProblemDetails, ProfilePasswordData>({
    mutationFn: (payload) => api.put('/api/profile/password', payload).then(() => undefined),
  })
}

/** Sem `valid_until` nas variables porque nenhuma tela o declara hoje — não
 * porque a regra o proíba. A D5 do bloco 1 diz o contrário: o campo "segue
 * aceito, e só nos três tipos permitidos. Nenhum deles entra no gate da RN-09,
 * que lê exclusivamente REUF". Quem protege a RN-09 aqui é o `Rule::in`
 * (`selfServiceValues()`), que barra o REUF por TIPO — validade de
 * CV/TÍTULO/POSTGRADO é capacidade suportada, não brecha.
 *
 * Fica de fora enquanto não houver chamador: parâmetro que ninguém passa é
 * superfície morta. Quando a tela oferecer o campo, ele volta — a spec §4 já o
 * lista no contrato da rota. */
export function useUploadProfileDocument() {
  const invalidate = useInvalidate(false)
  return useMutation<RedatorDocumentData, ProblemDetails, { type: RedatorDocumentType; file: File }>(
    {
      mutationFn: ({ type, file }) =>
        postMultipart<RedatorDocumentData>('/api/profile/documents', { type, file }),
      onSuccess: invalidate,
    },
  )
}
