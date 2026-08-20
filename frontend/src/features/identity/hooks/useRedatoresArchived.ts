import { useArchiveAction, useArchivedPage } from '@shared/hooks'
import { redatoresApi } from '@shared/api/redatoresApi'
import type { ArchivedRedatorData, RedatorData } from '@shared/types/generated'

/** Molde: `useClientsArchived`. É este arquivo que mantém `redatoresApi` fora de
 * `PeoplePage` (lint `no-restricted-syntax`).
 *
 * O toast de erro — que vive em `shared/` desde o Q-3 — não é conveniência aqui:
 * o arquivar tem gate de turma em andamento (spec D3) e o restaurar tem o gate de
 * redator arquivado, e os dois devolvem 422 com a frase do que fazer. */
export function useRedatoresArchived() {
  const page = useArchivedPage<RedatorData, ArchivedRedatorData>(redatoresApi, (row) => row.redator)

  return { ...page, ...useArchiveAction(redatoresApi.useRemove()) }
}
