import { useLoadState } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'
import type { DialogMode } from '@shared/lib'

/** Clientes do dropdown de empresa do aluno.
 *
 * Só busca no create: view/edit mostram `current_client_name` (já vem no
 * StudentData), sem chamada extra. O create em si segue exigindo só
 * `identity.user.create` (D8/StudentController) — quem tiver a permissão mas não
 * conseguir listar clientes (`commercial.client.view`) vê o motivo na tela, em
 * vez de o botão sumir ou o dropdown ficar vazio sem explicação. */
export function useStudentClients(mode: DialogMode) {
  const isCreate = mode === 'create'
  const load = useLoadState(clientsApi.useList({ enabled: isCreate }))

  return {
    ...load,
    /** `ClientData.id` é `undefined | number` no DTO gerado (o molde serve
     * create e edit); um cliente vindo da listagem sempre tem id persistido.
     * Descartar o impossível AQUI dá `value: number` de verdade e poupa o cast
     * de quem consome — a asserção atravessava a fronteira do
     * `StudentClientField` com três linhas de comentário (review do BD-4, Q-3). */
    options: load.data.flatMap((c) => (c.id == null ? [] : [{ label: c.legal_name, value: c.id }])),
    /** Fora do create não há query nem dropdown para travar: o campo é texto. */
    unusable: isCreate && load.unusable,
  }
}
