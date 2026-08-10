import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type {
  BatchIssueItemResultData,
  EmissionPanelEnrollmentData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'
import { useIssueBatch } from '../api/certificatesApi'
import { rowCertKind } from '../lib/certStatus'

/** Uma linha do relatório de lote, com o nome do aluno JÁ resolvido. O join
 * por `enrollment_id` mora neste hook, e não no JSX de `BatchIssueDialog`,
 * porque é aqui que vive a foto que o torna possível (ver `submitted`
 * abaixo): separar os dois deixava o invariante num arquivo e a execução em
 * outro, e obrigava o teste do hook a reimplementar o join para poder
 * asseverar. */
export type BatchReportRow = {
  enrollmentId: number
  /** Nome do aluno, ou o ID cru quando a matrícula não está na foto — só
   * acontece se o backend devolver item que não foi submetido. */
  studentName: string
  ok: boolean
  codigo: string | null
  /** Mensagem crua do backend (já es-CL — não traduzir). */
  error: string | null
}

/**
 * Estado do diálogo de emissão em lote: deriva os `pendientes` da turma
 * (mesma regra da coluna Certificado — `rowCertKind === 'sin_emitir'`) e a
 * pré-seleção de relator (mesma regra do `ConfirmIssueDialog` — 1 relator
 * pré-seleciona, mais de 1 exige escolha), depois dispara `useIssueBatch`.
 * A mutação mora aqui, não no componente: `no-restricted-syntax` reprova
 * `useMutation`/`useIssueBatch` sob `features/*\/components/**`.
 *
 * A resposta não fecha o diálogo — vira o `report` por linha que
 * `BatchIssueDialog` renderiza, e é também o discriminante entre a tela de
 * confirmação (`null`) e a de resultado. Enquanto não há resposta,
 * `pendientes` segue a turma viva (é o que alimenta a contagem do corpo de
 * confirmação). No `submit`, tira uma foto dessa lista e passa a devolvê-la
 * congelada: a invalidação do `onSuccess` do `useIssueBatch` refaz o fetch do
 * painel em background com o diálogo de resultado ainda aberto, e as
 * matrículas recém-emitidas saem de `sin_emitir` — sem a foto, o join perde
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

  const report: BatchReportRow[] | null =
    results?.map((item) => ({
      enrollmentId: item.enrollment_id,
      studentName:
        pendientes.find((e) => e.enrollment_id === item.enrollment_id)?.student_name ??
        String(item.enrollment_id),
      ok: item.ok,
      codigo: item.codigo,
      error: item.error,
    })) ?? null

  const okCount = report?.filter((r) => r.ok).length ?? 0

  return {
    pendientes,
    redatorId,
    setRedatorId,
    submit,
    pending: issueBatch.isPending,
    fieldErrors,
    message,
    report,
    okCount,
    failedCount: (report?.length ?? 0) - okCount,
  }
}
