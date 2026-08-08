import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type {
  BatchIssueItemResultData,
  EmissionPanelEnrollmentData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'
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
 * `pendientes`. Enquanto não há `results`, `pendientes` segue a turma viva
 * (é o que alimenta a contagem do corpo de confirmação). No `submit`, tira
 * uma foto dessa lista e passa a devolvê-la congelada: a invalidação do
 * `onSuccess` do `useIssueBatch` refaz o fetch do painel em background com o
 * diálogo de resultado ainda aberto, e as matrículas recém-emitidas saem de
 * `sin_emitir` — sem a foto, o join do relatório por `enrollment_id` perde
 * justamente as linhas `ok: true` e mostra o ID cru no lugar do nome.
 */
export function useBatchIssue(turma: EmissionPanelTurmaData) {
  const issueBatch = useIssueBatch()
  const { fieldErrors, message } = useMutationErrors([issueBatch.error])
  const [redatorId, setRedatorId] = useState<number | null>(
    turma.redatores.length === 1 ? turma.redatores[0].redator_id : null,
  )
  const [results, setResults] = useState<BatchIssueItemResultData[] | null>(null)
  const [submitted, setSubmitted] = useState<EmissionPanelEnrollmentData[] | null>(null)

  const live = turma.enrollments.filter((e) => rowCertKind(e) === 'sin_emitir')
  const pendientes = submitted ?? live

  const submit = () => {
    if (redatorId == null || issueBatch.isPending || live.length === 0) return
    setSubmitted(live)
    issueBatch.mutate({ enrollmentIds: live.map((e) => e.enrollment_id), redatorId }, { onSuccess: setResults })
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
