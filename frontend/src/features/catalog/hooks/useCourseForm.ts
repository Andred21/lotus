import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { CourseData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { coursesApi } from '@shared/api/coursesApi'
import { useSyncCourseRedatores } from '../api/useCourseRedatores'

export type CourseDialogMode = DialogMode

/**
 * Só os campos que o formulário edita. `redator_ids` fica aqui para o multiselect
 * do create, mas NÃO vai no payload do curso (o backend ignora na escrita): é
 * sincronizado pelo endpoint dedicado. `templates` fica de fora (config à parte).
 */
export type CourseFormFields = Pick<
  CourseData,
  'id' | 'name' | 'technical_name' | 'description' | 'workload_hours' | 'redator_ids'
>

const EMPTY: CourseFormFields = {
  id: undefined, name: '', technical_name: null, description: null, workload_hours: 0, redator_ids: [],
}

const toFields = (c: CourseFormFields): CourseFormFields => {
  const { id, name, technical_name, description, workload_hours, redator_ids } = c
  return structuredClone({ id, name, technical_name, description, workload_hours, redator_ids })
}

export function useCourseForm(course: CourseData | null, mode: CourseDialogMode, onDone: () => void) {
  const { form, set, setForm, readOnly } = useEntityForm<CourseFormFields>(course, mode, EMPTY, toFields)
  const create = coursesApi.useCreate()
  const update = coursesApi.useUpdate()
  const sync = useSyncCourseRedatores()

  // Updater funcional: dois toggles no mesmo tick precisam ver o array já
  // atualizado pelo anterior (mesmo motivo do toggleCourse no redator).
  const toggleRedator = (id: number) =>
    setForm((f) => ({
      ...f,
      redator_ids: f.redator_ids.includes(id)
        ? f.redator_ids.filter((x) => x !== id)
        : [...f.redator_ids, id],
    }))

  function submit() {
    // redator_ids NÃO entra: o backend ignora na escrita do curso.
    const payload = {
      name: form.name,
      technical_name: form.technical_name,
      description: form.description,
      workload_hours: form.workload_hours,
    }

    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: (created) => {
          // Exceção do produto: habilitação permitida no create. Sem redatores
          // escolhidos, não dispara a 2ª chamada à toa.
          if (form.redator_ids.length === 0) {
            onDone()
            return
          }
          sync.mutate({ courseId: created.id!, redator_ids: form.redator_ids }, { onSuccess: onDone })
        },
      })
      return
    }

    // Em edit a habilitação é só leitura (edição mora em Pessoas): só os campos.
    update.mutate({ id: course!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error, sync.error])

  return {
    form, set, toggleRedator, readOnly, submit,
    pending: create.isPending || update.isPending || sync.isPending,
    fieldErrors, generalError,
  }
}
