import { useMemo } from 'react'
import { redatoresApi } from '@shared/api/redatoresApi'
import type { RedatorData, TurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
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
    designate: (redatorId: number) => designate.mutate({ turmaId: turma.id!, redatorId }),
    remove: (redatorId: number) => remove.mutate({ turmaId: turma.id!, redatorId }),
    pending: designate.isPending || remove.isPending,
    error,
  }
}
