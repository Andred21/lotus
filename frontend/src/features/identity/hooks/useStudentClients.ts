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
  const clients = clientsApi.useList({ enabled: isCreate })

  return {
    options: (clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id })),
    /** Bloqueia só quando NÃO há lista utilizável (ainda carregando, falhou sem
     * cache prévio, ou a lista veio vazia — `[]` é truthy, então checar só
     * `!clients.data` deixaria passar cliente nenhum pra escolher). Um refetch
     * em background que falha com `clients.data` já populado (retry manual,
     * refoco de aba) não deve travar um form que ainda tem opções válidas. */
    unusable: isCreate && !clients.data?.length,
    isError: clients.isError,
    errorDetail: clients.error?.detail,
    /** Lista vazia de verdade — nem erro, nem carregando. Tem mensagem própria,
     * distinta da de falha. */
    showEmptyHint: !clients.isError && clients.isSuccess && clients.data.length === 0,
    refetch: () => {
      void clients.refetch()
    },
  }
}
