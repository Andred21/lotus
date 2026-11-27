import { useEntityForm, useFormMutationErrors, useUnsavedChangesGuard } from '@shared/hooks'
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
  const { form, set: setField, readOnly, dirty } = useEntityForm<TurmaConfigPayload & { id?: number }>(
    entity,
    mode,
    { ...EMPTY },
    (e) => structuredClone(e),
  )

  const guard = useUnsavedChangesGuard(dirty)

  const create = useCreateTurma()
  const update = useUpdateTurma()
  const { fieldErrors, generalError, set } = useFormMutationErrors<TurmaConfigPayload & { id?: number }>(setField, [create.error, update.error])

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

  // Salvar com sucesso entrega o id a `onSaved`, que NAVEGA na criação (para o
  // detalhe). A liberação sai aqui, imediatamente antes: o form segue sujo até a
  // tela trocar, e sem ela o próprio salvar abriria o aviso de descartar. Só com
  // rascunho: com o form limpo não há blocker para consumi-la nem mudança de
  // `dirty` que a revogue, e ela sobraria para o próximo rascunho (editar sem
  // mudar nada e salvar deixa o cartão montado na página de detalhe).
  const saved = (id: number | undefined) => {
    if (id == null) return
    if (dirty) guard.allowNavigation()
    try {
      onSaved(id)
    } catch (error) {
      // A tela segue aberta e suja: a liberação não consumida não pode sobrar.
      guard.revoke()
      throw error
    }
  }

  const submit = () => {
    if (mode === 'create') {
      if (quoteId == null) return
      create.mutate({ quoteId, payload: payload() }, { onSuccess: (t) => saved(t.id) })
    } else if (turma?.id != null) {
      update.mutate({ turmaId: turma.id, payload: payload() }, { onSuccess: (t) => saved(t.id) })
    }
  }

  return {
    form,
    set,
    readOnly,
    dirty,
    guard,
    submit,
    pending: create.isPending || update.isPending,
    fieldErrors,
    generalError,
    workloadHours: course?.workload_hours ?? null,
  }
}
