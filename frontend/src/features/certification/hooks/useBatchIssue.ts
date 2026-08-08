import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { BatchIssueItemResultData, EmissionPanelTurmaData } from '@shared/types/generated'
import { useIssueBatch } from '../api/certificatesApi'
import { rowCertKind } from '../lib/certStatus'

/**
 * Estado do diálogo de emissão em lote: deriva os `pendientes` da turma
 * (mesma regra da coluna Certificado — `rowCertKind === 'sin_emitir'`) e a
 * pré-seleção de relator (mesma regra do `ConfirmIssueDialog` — 1 relator
 * pré-seleciona, mais de 1 exige escolha), depois dispara `useIssueBatch`.
 * A mutação mora aqui, não no componente: `no-restricted-syntax` reprova
 * `useMutation`/`useIssueBatch` sob `features/*\/components/**`.
 *
 * `results` não fecha o diálogo — vira o relatório por linha que
 * `BatchIssueDialog` renderiza, feito de join por `enrollment_id` com
 * `pendientes` (a mesma lista que virou o payload do POST).
 */
export function useBatchIssue(turma: EmissionPanelTurmaData) {
  const issueBatch = useIssueBatch()
  const { fieldErrors, message } = useMutationErrors([issueBatch.error])
  const [redatorId, setRedatorId] = useState<number | null>(
    turma.redatores.length === 1 ? turma.redatores[0].redator_id : null,
  )
  const [results, setResults] = useState<BatchIssueItemResultData[] | null>(null)

  const pendientes = turma.enrollments.filter((e) => rowCertKind(e) === 'sin_emitir')

  const submit = () => {
    if (redatorId == null || issueBatch.isPending || pendientes.length === 0) return
    issueBatch.mutate(
      { enrollmentIds: pendientes.map((e) => e.enrollment_id), redatorId },
      { onSuccess: setResults },
    )
  }

  return {
    pendientes,
    redatorId,
    setRedatorId,
    submit,
    pending: issueBatch.isPending,
    fieldErrors,
    message,
    results,
  }
}
