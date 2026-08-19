import { useArchiveAction, useArchivedPage } from '@shared/hooks'
import type { ArchivedTurmaData, TurmaData } from '@shared/types/generated'
import { useArchiveTurma, useRestoreTurma, useTurmasArchivedList } from '../api/useTurmas'

/**
 * `useArchivedPage` exige `ArchivableResource<TArchived>` — contrato ESTRUTURAL,
 * não a fábrica `createCrudResource` (spec D12). `useTurmas.ts` é artesanal e não
 * migra; o recurso é montado aqui.
 *
 * As propriedades são FUNÇÕES NOMEADAS começando em `use`: o
 * `react-hooks/rules-of-hooks` decide pelo nome do que está sendo definido, e
 * seta anônima numa propriedade não é reconhecida como hook.
 */
const recursoDeTurmas = {
  useArchivedList: function useArchivedList(enabled: boolean) {
    return useTurmasArchivedList(enabled)
  },
  useRestore: function useRestore() {
    return useRestoreTurma()
  },
}

/** Molde: `useClientsArchived`. Os toasts vivem em `shared/` (Q-3 do review de
 * 2026-08-19), e aqui o de erro cobre dois 422 próprios: turma concluída na
 * RN-15 ao arquivar, e os gates da spec D1 e do redator arquivado ao restaurar. */
export function useTurmasArchived() {
  const page = useArchivedPage<TurmaData, ArchivedTurmaData>(recursoDeTurmas, (row) => row.turma)

  return { ...page, ...useArchiveAction(useArchiveTurma()) }
}
