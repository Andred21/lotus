import { useState } from 'react'
import type { ImportPreviewRowData, ImportResultData, ImportRowStatus } from '@shared/types/generated'
import { useBlobDownload, useMutationErrors } from '@shared/hooks'
import { useConfirmImport, useDownloadImportTemplate, usePreviewImport } from '../api/useImportStudents'
import { parseImportRefusals } from '../lib/importRefusals'

export type TriageRow = ImportPreviewRowData & {
  edited: boolean
  removed: boolean
  update_registration: boolean
  /** Por que o Actualizar seria recusado (prévia ou 422); com ele ligado a linha não é enviável. */
  update_blocked: string | null
  /** O servidor recusou a linha na confirmação: só volta a ser enviável depois de editada. */
  refused: boolean
}

type Step = 'upload' | 'triage' | 'result'
type Fields = Pick<TriageRow, 'rut' | 'name' | 'email' | 'phone'>
type Origin = Fields & Pick<TriageRow, 'update_blocked'>

const TEMPLATE_FILENAME = 'plantilla-alumnos.xlsx'
const EMPTY_COUNTS: Record<ImportRowStatus, number> = {
  new: 0,
  registered: 0,
  moves: 0,
  already_enrolled: 0,
  error: 0,
}

// Tom da D7, fonte única da contagem do topo e da tag de cada linha: nuevos
// (sucesso), ya registrados (neutro), cambian de empresa (aviso), ya matriculados
// (neutro), con error (perigo).
export const STATUS_TONE: Record<ImportRowStatus, 'success' | 'secondary' | 'warning' | 'danger'> = {
  new: 'success',
  registered: 'secondary',
  moves: 'warning',
  already_enrolled: 'secondary',
  error: 'danger',
}

const fieldsOf = ({ rut, name, email, phone }: Fields): Fields => ({ rut, name, email, phone })
const originOf = (r: TriageRow): Origin => ({ ...fieldsOf(r), update_blocked: r.update_blocked })
export const isRegistered = (r: TriageRow) => r.status === 'registered' || r.status === 'moves'
// Recusada e ainda não editada: a tela a trata como `error`, mas sem perder o status de origem.
export const isRefusedPending = (r: TriageRow) => r.refused && !r.edited
/** Situação que a triagem mostra e conta: a recusada não editada vale `error`. */
export const displayStatus = (r: TriageRow): ImportRowStatus => (isRefusedPending(r) ? 'error' : r.status)
// D12: já matriculado nunca vai; `error` e recusada só vão depois de editados. D5: Actualizar
// com motivo de recusa não vai (nem de ida: o servidor devolveria 422 e nada seria gravado).
const isSendable = (r: TriageRow) =>
  !r.removed &&
  r.status !== 'already_enrolled' &&
  (displayStatus(r) !== 'error' || r.edited) &&
  !(r.update_registration && r.update_blocked)

// A recusada de linha cadastrada (`registered`/`moves`) mantém a situação de origem — RUT
// travado, Mantener/Actualizar e a troca de empresa — e a flag como foi enviada: o RUT é
// travado, então a correção não muda de aluno. Só segue depois de editada. Linha
// `new`/`error` vira `error`.
const markRefused = (r: TriageRow, message: string): TriageRow =>
  isRegistered(r)
    ? { ...r, message, refused: true, edited: false }
    : { ...r, status: 'error', message, edited: false, update_registration: false }

/**
 * Máquina do diálogo de importação (D8): `upload` → `triage` → `result`. Toda a
 * triagem vive aqui, no cliente; a API só é chamada na prévia e na confirmação.
 * A chave da linha é `row` (número na planilha). `close` é inerte em voo (o
 * diálogo trava ESC/X para o 422/403 ter onde pousar) e, fora dele, zera tudo.
 */
export function useImportStudentsFlow(turmaId: number) {
  const previewMutation = usePreviewImport()
  const confirmMutation = useConfirmImport()
  const templateMutation = useDownloadImportTemplate()
  const saveBlob = useBlobDownload()
  const { message } = useMutationErrors([
    previewMutation.error,
    confirmMutation.error,
    templateMutation.error,
  ])

  const [step, setStep] = useState<Step>('upload')
  const [all, setAll] = useState<TriageRow[]>([])
  const [origin, setOrigin] = useState<Record<number, Origin>>({})
  const [canUpdateRegistration, setCanUpdate] = useState(false)
  const [result, setResult] = useState<ImportResultData | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const pending = previewMutation.isPending || confirmMutation.isPending
  const rows = all.filter((r) => !r.removed)
  const counts = rows.reduce((acc, r) => {
    const status = displayStatus(r)
    return { ...acc, [status]: acc[status] + 1 }
  }, EMPTY_COUNTS)
  const sendable = all.filter(isSendable)
  // 422 da confirmação com recusa por linha: nada foi gravado e a triagem segue aberta.
  const nothingImported = confirmMutation.isError && parseImportRefusals(confirmMutation.error.errors) !== null

  const load = (list: TriageRow[]) => {
    setAll(list)
    setOrigin(Object.fromEntries(list.map((r) => [r.row, originOf(r)])))
  }

  const patchRow = (row: number, fn: (r: TriageRow) => TriageRow) =>
    setAll((cur) => cur.map((r) => (r.row === row ? fn(r) : r)))

  const upload = (files: File[]) => {
    setSizeError(null)
    const file = files[0]
    if (!file) return
    previewMutation.mutate(
      { turmaId, file },
      {
        onSuccess: (preview) => {
          load(preview.rows.map((r) => ({ ...r, edited: false, removed: false, update_registration: false, update_blocked: r.update_refusal, refused: false })))
          setCanUpdate(preview.can_update_registration)
          setStep('triage')
        },
      },
    )
  }

  const edit = (row: number, patch: Fields) =>
    patchRow(row, (r) => {
      // D12: em linha já cadastrada o RUT é travado; D16: editar liga Actualizar.
      const next = isRegistered(r) ? { ...patch, rut: r.rut } : patch
      // D5: os valores novos são julgados na confirmação, então o veredito antigo cai.
      return { ...r, ...fieldsOf(next), edited: true, update_blocked: null, update_registration: isRegistered(r) || r.update_registration }
    })

  const remove = (row: number) => patchRow(row, (r) => ({ ...r, removed: true }))

  const setUpdate = (row: number, value: boolean) =>
    patchRow(row, (r) => {
      // Voltar a Mantener descarta a edição (D16): restaura os valores e o veredito da prévia.
      if (!value && r.edited) return { ...r, ...origin[row], edited: false, update_registration: false }
      return { ...r, update_registration: value }
    })

  const confirm = () => {
    const sent = sendable
    confirmMutation.mutate(
      {
        turmaId,
        rows: sent.map(({ row, rut, name, email, phone, update_registration }) => ({
          row, rut, name, email, phone, update_registration,
        })),
      },
      {
        onSuccess: (res) => {
          const byRow = new Map(res.errors.map((e) => [e.row, e.message]))
          load(sent.filter((r) => byRow.has(r.row)).map((r) => markRefused(r, byRow.get(r.row) ?? '')))
          setResult(res)
          setStep('result')
        },
        onError: (problem) => {
          const refusals = parseImportRefusals(problem.errors)
          if (!refusals) return
          // Fica em `triage`, com todas as linhas: só se marca o que o servidor recusou.
          setAll((cur) =>
            cur.map((r) => {
              const refused = refusals.row.get(r.row)
              if (refused !== undefined) return markRefused(r, refused)
              const blocked = refusals.update.get(r.row)
              if (blocked === undefined) return r
              // D5: linha não editada volta ao Mantener (Actualizar bloqueado, linha enviável).
              // Editada mantém a flag: Mantener descartaria a edição (D16).
              return r.edited ? { ...r, update_blocked: blocked } : { ...r, update_blocked: blocked, update_registration: false }
            }),
          )
        },
      },
    )
  }

  const downloadTemplate = () =>
    templateMutation.mutate(turmaId, { onSuccess: (blob) => saveBlob(blob, TEMPLATE_FILENAME) })

  const close = () => {
    if (pending) return
    setStep('upload')
    load([])
    setCanUpdate(false)
    setResult(null)
    setSizeError(null)
    previewMutation.reset()
    confirmMutation.reset()
    templateMutation.reset()
  }

  return {
    step,
    rows,
    counts,
    sendableCount: sendable.length,
    canUpdateRegistration,
    result,
    pending,
    templatePending: templateMutation.isPending,
    sizeError,
    setSizeError,
    /** O 422 por linha tem aviso próprio (`nothingImported`): a mensagem genérica não o repete. */
    message: nothingImported ? null : message,
    nothingImported,
    upload,
    edit,
    remove,
    setUpdate,
    confirm,
    /** Do resumo de volta à triagem, com as linhas recusadas. */
    reviewRefused: () => setStep('triage'),
    downloadTemplate,
    close,
  }
}
