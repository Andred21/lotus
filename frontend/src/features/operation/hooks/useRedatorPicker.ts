import { useMemo, useState } from 'react'
import { redatoresApi } from '@shared/api/redatoresApi'
import type { MotivoInidoneidade, RedatorData, TurmaData } from '@shared/types/generated'
import { loadFailure, useMutationErrors } from '@shared/hooks'
import { motivosInidoneidade } from '../lib/eligibility'
import { useDesignateRedator, useRemoveRedator } from '../api/useTurmas'

export type RedatorPickerOption = { redator: RedatorData; motivos: MotivoInidoneidade[] }

/** Redatores para designar na turma, MENOS os já designados. A idoneidade (RN-09)
 * é só aviso: todos entram na lista, cada um com seus motivos, e o inidôneo só é
 * designado depois da confirmação. O front calcula os motivos para avisar; quem
 * audita a designação é o backend. */
export function useRedatorPicker(turma: TurmaData) {
  const redatores = redatoresApi.useList()
  const designate = useDesignateRedator()
  const remove = useRemoveRedator()
  const { message: error } = useMutationErrors([designate.error, remove.error])
  const [pendingConfirmation, setPendingConfirmation] = useState<RedatorPickerOption | null>(null)

  const assignedIds = useMemo(() => new Set(turma.redatores.map((r) => r.id)), [turma.redatores])

  const all: RedatorPickerOption[] = useMemo(() => {
    if (turma.course_id == null) return []
    return (redatores.data ?? [])
      .filter((r) => r.id != null)
      .map((redator) => ({ redator, motivos: motivosInidoneidade(redator, turma.course_id!) }))
  }, [redatores.data, turma.course_id])

  const options = useMemo(() => all.filter((o) => !assignedIds.has(o.redator.id!)), [all, assignedIds])

  const doDesignate = (redatorId: number) => designate.mutate({ turmaId: turma.id!, redatorId })

  return {
    options,
    /** `null` = lista não carregada ou redator fora dela: sem motivos conhecidos,
     * a tela não afirma "Idóneo" por omissão. */
    motivosDe: (redatorId: number): MotivoInidoneidade[] | null =>
      all.find((o) => o.redator.id === redatorId)?.motivos ?? null,
    pendingConfirmation,
    /** `true` = designou direto; `false` = abriu a confirmação do inidôneo. */
    pick: (redatorId: number): boolean => {
      const option = options.find((o) => o.redator.id === redatorId)
      if (option && option.motivos.length > 0) {
        setPendingConfirmation(option)
        return false
      }
      doDesignate(redatorId)
      return true
    },
    confirmPick: () => {
      if (pendingConfirmation) doDesignate(pendingConfirmation.redator.id!)
      setPendingConfirmation(null)
    },
    cancelPick: () => setPendingConfirmation(null),
    loadingList: redatores.isLoading,
    /** Falha do GET de redatores, distinta de `error` (erro de mutação). Sem ela
     * `options` vinha `[]` tanto em lista vazia quanto em GET quebrado, e o
     * diálogo afirmava "nenhum redator disponível" sobre uma falha de rede — o
     * mesmo defeito que a spec D16 matou nas listagens. */
    loadError: loadFailure(redatores),
    reloadList: (): Promise<unknown> => redatores.refetch(),
    remove: (redatorId: number) => remove.mutate({ turmaId: turma.id!, redatorId }),
    pending: designate.isPending || remove.isPending,
    error,
  }
}
