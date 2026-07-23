import { useTranslation } from 'react-i18next'
import type { TurmaData } from '@shared/types/generated'
import { useMutationErrors, usePermissions } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { useConcludeTurma } from '../api/useTurmas'
import { turmaDisplayStatus } from '../lib/turmaStatus'

/** Orquestra a aba Conclusión. Nenhuma regra de habilitação é recalculada aqui:
 * `habilitada` e `missing_document_types` vêm derivados do backend. */
export function useConclusionSection(turma: TurmaData) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const toast = useToast()
  const mutation = useConcludeTurma()
  const { message: error } = useMutationErrors([mutation.error])

  const concluida = turma.status === 'concluida'
  const habilitada = turma.habilitada === true

  return {
    displayStatus: turmaDisplayStatus(turma),
    habilitada,
    concluida,
    missingTypes: turma.missing_document_types ?? [],
    // `can()` é conveniência de interface; a API é que autoriza (ADR-07).
    canComplete: can('operation.turma.complete'),
    concludedAt: turma.concluded_at ?? null,
    // O dialog fecha só no sucesso (onSuccess do caller): com a mutation em voo,
    // o ConfirmDialog trava ESC/X/Cancelar para o 403/422 ter onde pousar.
    conclude: (options?: { onSuccess: () => void }) =>
      mutation.mutate(turma.id!, {
        onSuccess: () => {
          toast.success(t('operation.conclusion.success'))
          options?.onSuccess()
        },
      }),
    concluding: mutation.isPending,
    error,
    // Reseta a mutation ao cancelar: sem isso, reabrir o dialog mostraria o
    // erro fantasma de uma tentativa que nunca ocorreu.
    resetConclude: () => mutation.reset(),
  }
}
