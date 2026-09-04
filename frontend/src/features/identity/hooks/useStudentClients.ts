import { useLoadState } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'
import type { DialogMode } from '@shared/lib'

/** Clientes do dropdown de empresa do aluno.
 *
 * Só busca no create: view/edit mostram `current_client_name` (já vem no
 * StudentData), sem chamada extra. Desde a D-11 a fonte é
 * `GET /api/students/client-options`, sob `identity.user.create` — o gate da
 * ação que o dropdown serve. Antes era `GET /api/clients`
 * (`commercial.client.view`), e quem tinha permissão de criar aluno sem a
 * comercial via o campo travado com o motivo na tela. */
export function useStudentClients(mode: DialogMode) {
  const isCreate = mode === 'create'
  const load = useLoadState(studentsApi.useClientOptions(isCreate))

  return {
    ...load,
    /** `id` aqui é `number` de verdade: o DTO do lookup não serve create e
     * edit ao mesmo tempo, então não há `Optional` a descartar — era o que o
     * `flatMap` fazia enquanto a fonte era `ClientData`. */
    options: load.data.map((c) => ({ label: c.legal_name, value: c.id })),
    /** Fora do create não há query nem dropdown para travar: o campo é texto. */
    unusable: isCreate && load.unusable,
  }
}
