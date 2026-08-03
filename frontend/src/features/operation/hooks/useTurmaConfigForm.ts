import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { DialogMode } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { useCreateTurma, useUpdateTurma, type TurmaConfigPayload } from '../api/useTurmas'

const EMPTY: TurmaConfigPayload = {
  modalidade: 'presencial',
  local_aplicacao: '',
  start_date: '',
  end_date: '',
}

function toFields(turma: TurmaData): TurmaConfigPayload {
  return {
    modalidade: turma.modalidade,
    local_aplicacao: turma.local_aplicacao ?? '',
    start_date: turma.start_date,
    end_date: turma.end_date,
  }
}

/** Form da configuração da turma, unificado view/edit/create. Create precisa do
 * `quoteId` (a turma nasce de `POST quotes/{quote}/turma`); edit precisa do
 * `turmaId`. `onSaved` recebe o id resultante para a navegação. */
export function useTurmaConfigForm(params: {
  mode: DialogMode
  turma: TurmaData | null
  quoteId?: number
  onSaved: (turmaId: number) => void
}) {
  const { mode, turma, quoteId, onSaved } = params
  const entity = turma ? ({ id: turma.id, ...toFields(turma) } as TurmaConfigPayload & { id?: number }) : null
  const { form, set, readOnly } = useEntityForm<TurmaConfigPayload & { id?: number }>(
    entity,
    mode,
    { ...EMPTY },
    (e) => structuredClone(e),
  )

  const create = useCreateTurma()
  const update = useUpdateTurma()
  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  // Carga horária contratada é leitura de apoio do form (o campo é `disabled`),
  // não entra no payload. A query dispara nos 3 modos, como sempre disparou.
  const courses = coursesApi.useList()
  const course = turma?.course_id != null ? courses.data?.find((c) => c.id === turma.course_id) : undefined

  const payload = (): TurmaConfigPayload => ({
    modalidade: form.modalidade,
    local_aplicacao: form.local_aplicacao || null,
    start_date: form.start_date,
    end_date: form.end_date,
  })

  const submit = () => {
    if (mode === 'create') {
      if (quoteId == null) return
      create.mutate({ quoteId, payload: payload() }, { onSuccess: (t) => t.id != null && onSaved(t.id) })
    } else if (turma?.id != null) {
      update.mutate({ turmaId: turma.id, payload: payload() }, { onSuccess: (t) => t.id != null && onSaved(t.id) })
    }
  }

  return {
    form,
    set,
    readOnly,
    submit,
    pending: create.isPending || update.isPending,
    fieldErrors,
    generalError,
    workloadHours: course?.workload_hours ?? null,
  }
}
