import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { problemMessage } from '@shared/api/problemMessage'
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

/** Molde: `useClientsArchived`. O `onError` do arquivar NÃO é conveniência aqui:
 * turma concluída é recusada com 422 pela RN-15, e sem o toast o clique fica
 * mudo (Q-2 do review de 2026-08-18). O do restaurar cobre o gate D1 —
 * "ya existe una clase activa para esta cotización". */
export function useTurmasArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<TurmaData, ArchivedTurmaData>(recursoDeTurmas, (row) => row.turma)
  const archiveMutation = useArchiveTurma()

  const falhou = (problem: Parameters<typeof problemMessage>[0]) => {
    const message = problemMessage(problem)
    if (message) toast.error(message)
  }

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: falhou,
      }),
    /** `onSuccess` do chamador fecha o ConfirmDialog — ele só fecha no sucesso,
     * para o 422 da RN-15 ter onde pousar. */
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      archiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t('archive.archivedToast'))
          options?.onSuccess?.()
        },
        onError: falhou,
      }),
    archiving: archiveMutation.isPending,
  }
}
