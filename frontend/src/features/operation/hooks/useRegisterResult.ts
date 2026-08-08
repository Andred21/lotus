import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EnrollmentApprovalStatus, EnrollmentData, EnrollmentResultData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useRecordResult } from '../api/useEnrollments'

type FormState = {
  approval_status: EnrollmentApprovalStatus
  finalGrade: string
  attendance_pct: string
}

// `grades` nasce `Array<any>` no generated.ts (o transformer não distingue
// array de objeto associativo em PHP — o `?array` do DTO é sempre um mapa
// `{final: ...}` em uso real, nunca uma lista). O cast é o único ponto de
// atrito entre o tipo gerado e a forma real; não se conserta reformatando o
// DTO nesta task (zero mudança de backend).
type GradesMap = Record<string, unknown>

function gradesOf(enrollment: EnrollmentData | null): GradesMap {
  return { ...(enrollment?.grades as GradesMap | null | undefined) }
}

function initialForm(enrollment: EnrollmentData | null): FormState {
  const final = gradesOf(enrollment).final
  return {
    approval_status: enrollment?.approval_status ?? 'pendiente',
    finalGrade: final == null ? '' : String(final),
    attendance_pct: enrollment?.attendance_pct ?? '',
  }
}

/**
 * Form do resultado acadêmico da matrícula (Task 10) — nota, presença e
 * estado de aprovação. `finalGrade` é texto livre: `"6,4"` (vírgula chilena)
 * chega ao backend como string, sem coerção numérica.
 *
 * Reset por `id` da matrícula + `visible` do diálogo, no padrão "adjust state
 * during render" (`useEntityForm`/`useClientForm` são a referência — nunca
 * `useEffect`, proibido por `react-hooks/set-state-in-effect`): o diálogo é
 * um único componente reaberto para matrículas diferentes, então tanto trocar
 * de aluno quanto reabrir para o MESMO aluno depois de cancelar precisa
 * partir dos valores atuais da matrícula, nunca do rascunho anterior.
 */
export function useRegisterResult(turmaId: number, enrollment: EnrollmentData | null, visible: boolean) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(() => initialForm(enrollment))
  const [prev, setPrev] = useState({ id: enrollment?.id ?? null, visible })

  const currentId = enrollment?.id ?? null
  if (currentId !== prev.id || visible !== prev.visible) {
    setPrev({ id: currentId, visible })
    setForm(initialForm(enrollment))
  }

  const mutation = useRecordResult(turmaId)
  const { fieldErrors, message } = useMutationErrors([mutation.error])

  const statusOptions = (['aprobado', 'reprobado', 'pendiente'] as const).map((value) => ({
    label: t(`certificate.${value}`),
    value,
  }))

  // Preserva as chaves de `grades` que esta tela não edita; omite `final`
  // por inteiro quando a nota fica vazia — a omissão é o caminho válido do
  // `PrintableGrade` no backend (nota ainda não lançada), não um erro.
  const toBody = (): EnrollmentResultData => {
    const grades = gradesOf(enrollment)
    if (form.finalGrade.trim() !== '') grades.final = form.finalGrade
    else delete grades.final

    // Mapa sem nenhuma chave vira `null`, não `{}`: o `?array` do backend
    // grava `[]` na coluna, e `grades` está no `auditInclude` da matrícula —
    // salvar só o estado de aprovação escreveria uma mudança de nota falsa na
    // auditoria de um registro com peso legal.
    const hasGrades = Object.keys(grades).length > 0

    return {
      grades: hasGrades ? (grades as unknown as EnrollmentResultData['grades']) : null,
      attendance_pct: form.attendance_pct.trim() === '' ? null : form.attendance_pct,
      approval_status: form.approval_status,
    }
  }

  const submit = (options?: { onSuccess?: () => void }) => {
    if (enrollment?.id == null) return
    mutation.mutate({ enrollmentId: enrollment.id, body: toBody() }, { onSuccess: options?.onSuccess })
  }

  return {
    form,
    setStatus: (v: EnrollmentApprovalStatus) => setForm((f) => ({ ...f, approval_status: v })),
    setFinalGrade: (v: string) => setForm((f) => ({ ...f, finalGrade: v })),
    setAttendance: (v: string) => setForm((f) => ({ ...f, attendance_pct: v })),
    statusOptions,
    submit,
    submitting: mutation.isPending,
    fieldErrors,
    message,
    reset: () => mutation.reset(),
  }
}
