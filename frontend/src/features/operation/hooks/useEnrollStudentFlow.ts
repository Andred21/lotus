import { useState } from 'react'
import type { EnrollPreviewData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useEnrollPreview } from '../api/useEnrollPreview'
import { useEnrollStudent } from '../api/useEnrollments'

type Step = 'rut' | 'details'

const EMPTY_DETAILS = { name: '', email: '', phone: '' }

/**
 * Máquina de 2 passos da matrícula individual (D5):
 *  passo 'rut'     → digita RUT, "Continuar" chama o preview.
 *                    preview.will_move → abre MoveConfirmDialog (confirm antes de avançar).
 *                    senão → avança direto a 'details'.
 *  passo 'details' → nome (sempre) + email (obrigatório só p/ aluno novo) + telefone → "Matricular".
 * Fecha e reseta ao concluir (onDone).
 */
export function useEnrollStudentFlow(
  turmaId: number,
  turmaClientName: string | null,
  onDone: () => void,
) {
  const [step, setStep] = useState<Step>('rut')
  const [rut, setRut] = useState('')
  const [preview, setPreview] = useState<EnrollPreviewData | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [details, setDetails] = useState(EMPTY_DETAILS)

  const previewMutation = useEnrollPreview()
  const enrollMutation = useEnrollStudent()
  const { fieldErrors, message } = useMutationErrors([
    previewMutation.error,
    enrollMutation.error,
  ])

  const reset = () => {
    setStep('rut')
    setRut('')
    setPreview(null)
    setMoveOpen(false)
    setDetails(EMPTY_DETAILS)
    previewMutation.reset()
    enrollMutation.reset()
  }

  const advanceToDetails = (p: EnrollPreviewData) => {
    // aluno existente → pré-preenche o nome (email desconhecido no preview)
    setDetails({ name: p.name ?? '', email: '', phone: '' })
    setStep('details')
  }

  const runPreview = () => {
    previewMutation.mutate(
      { turmaId, rut },
      {
        onSuccess: (p) => {
          setPreview(p)
          if (p.will_move) setMoveOpen(true)
          else advanceToDetails(p)
        },
      },
    )
  }

  const confirmMove = () => {
    setMoveOpen(false)
    if (preview) advanceToDetails(preview)
  }

  const cancelMove = () => {
    setMoveOpen(false)
  }

  const setField = (k: keyof typeof EMPTY_DETAILS, v: string) =>
    setDetails((d) => ({ ...d, [k]: v }))

  const submit = () => {
    enrollMutation.mutate(
      {
        turmaId,
        payload: {
          rut,
          name: details.name,
          email: details.email || null,
          phone: details.phone || null,
        },
      },
      {
        onSuccess: () => {
          reset()
          onDone()
        },
      },
    )
  }

  return {
    step,
    rut,
    setRut,
    preview,
    isNewStudent: preview ? !preview.exists : true,
    moveOpen,
    turmaClientName,
    details,
    setField,
    runPreview,
    confirmMove,
    cancelMove,
    submit,
    reset,
    fieldErrors,
    message,
    previewing: previewMutation.isPending,
    submitting: enrollMutation.isPending,
  }
}
