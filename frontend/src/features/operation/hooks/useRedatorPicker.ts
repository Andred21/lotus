import { useMemo } from 'react'
import { redatoresApi } from '@shared/api/redatoresApi'
import type { RedatorData, TurmaData } from '@shared/types/generated'
import { loadFailure, useMutationErrors } from '@shared/hooks'
import { isEligible } from '../lib/eligibility'
import { useDesignateRedator, useRemoveRedator } from '../api/useTurmas'

/** Lista de redatores idôneos para o curso da turma, MENOS os já designados.
 * Idoneidade é calculada no front (RN-09 espelhado; a API é a fronteira real). */
export function useRedatorPicker(turma: TurmaData) {
  const redatores = redatoresApi.useList()
  const designate = useDesignateRedator()
  const remove = useRemoveRedator()
  const { message: error } = useMutationErrors([designate.error, remove.error])

  const assignedIds = useMemo(() => new Set(turma.redatores.map((r) => r.id)), [turma.redatores])

  const eligible: RedatorData[] = useMemo(() => {
    if (turma.course_id == null) return []
    return (redatores.data ?? []).filter(
      (r) => r.id != null && !assignedIds.has(r.id) && isEligible(r, turma.course_id!),
    )
  }, [redatores.data, assignedIds, turma.course_id])

  return {
    eligible,
    loadingList: redatores.isLoading,
    /** Falha do GET de redatores, distinta de `error` (erro de mutação). Sem ela
     * `eligible` vinha `[]` tanto em lista vazia quanto em GET quebrado, e o
     * diálogo afirmava "nenhum redator elegível" sobre uma falha de rede — o
     * mesmo defeito que a spec D16 matou nas listagens. */
    loadError: loadFailure(redatores),
    reloadList: (): Promise<unknown> => redatores.refetch(),
    designate: (redatorId: number) => designate.mutate({ turmaId: turma.id!, redatorId }),
    remove: (redatorId: number) => remove.mutate({ turmaId: turma.id!, redatorId }),
    pending: designate.isPending || remove.isPending,
    error,
  }
}
