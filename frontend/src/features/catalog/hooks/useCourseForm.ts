import { useRef } from 'react'
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { CourseData, CourseModuleData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { coursesApi } from '@shared/api/coursesApi'
import { useSyncCourseRedatores } from '../api/useCourseRedatores'

export type CourseDialogMode = DialogMode

/**
 * Só os campos que o formulário edita. `redator_ids` fica aqui para o multiselect
 * do create, mas NÃO vai no payload do curso (o backend ignora na escrita): é
 * sincronizado pelo endpoint dedicado. `templates` fica de fora (config à parte)
 * — e agora omiti-lo preserva os templates, em vez de apagá-los.
 *
 * `modules` é `Optional` no contrato (ausente = não mexe), mas aqui é array
 * sempre: esta tela é a dona do quadro de módulos e manda a coleção inteira.
 */
export type CourseFormFields = Pick<
  CourseData,
  'id' | 'name' | 'technical_name' | 'description' | 'workload_hours' | 'redator_ids'
> & { modules: CourseModuleData[] }

/** Módulo novo do formulário. `sort_order`/`total_hours` ficam undefined: o
 * backend os deriva (do índice do array e da soma) e ignora o que vier. */
export const EMPTY_MODULE: CourseModuleData = {
  id: undefined, name: '', learnings: null, contents: null,
  theory_hours: 0, practice_hours: 0, sort_order: undefined, total_hours: undefined,
}

const EMPTY: CourseFormFields = {
  id: undefined, name: '', technical_name: null, description: null, workload_hours: 0,
  redator_ids: [], modules: [],
}

const toFields = (c: CourseFormFields): CourseFormFields => {
  const { id, name, technical_name, description, workload_hours, redator_ids, modules } = c
  return structuredClone({ id, name, technical_name, description, workload_hours, redator_ids, modules })
}

export function useCourseForm(course: CourseData | null, mode: CourseDialogMode, onDone: () => void) {
  // A resposta da API sempre traz `modules`; o `| undefined` do tipo é do lado da
  // ENTRADA (Optional). Normaliza aqui para o form não carregar o undefined.
  const entity: CourseFormFields | null = course ? { ...course, modules: course.modules ?? [] } : null
  const { form, set, setForm, readOnly } = useEntityForm<CourseFormFields>(entity, mode, EMPTY, toFields)
  const create = coursesApi.useCreate()
  const update = coursesApi.useUpdate()
  const sync = useSyncCourseRedatores()

  // Se o curso já foi criado numa tentativa anterior (o sync de redatores falhou),
  // um resubmit NÃO pode recriá-lo — curso é registro de peso legal. Guarda o id e
  // re-tenta só a habilitação. O ref zera sozinho: o dialog desmonta ao fechar.
  const createdIdRef = useRef<number | null>(null)

  // Updater funcional: dois toggles no mesmo tick precisam ver o array já
  // atualizado pelo anterior (mesmo motivo do toggleCourse no redator).
  const toggleRedator = (id: number) =>
    setForm((f) => ({
      ...f,
      redator_ids: f.redator_ids.includes(id)
        ? f.redator_ids.filter((x) => x !== id)
        : [...f.redator_ids, id],
    }))

  const addModule = () =>
    setForm((f) => ({ ...f, modules: [...f.modules, structuredClone(EMPTY_MODULE)] }))

  const removeModule = (i: number) =>
    setForm((f) => ({ ...f, modules: f.modules.filter((_, idx) => idx !== i) }))

  const patchModule = (i: number, patch: Partial<CourseModuleData>) =>
    setForm((f) => ({ ...f, modules: f.modules.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }))

  // A ordem do array É o sort_order (o backend o deriva do índice). Mover = trocar
  // com o vizinho. No-op nas pontas: os botões já vêm desabilitados lá, então um
  // índice fora de faixa só chegaria por bug — e derrubar o diálogo não é a resposta.
  const moveModule = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const j = i + dir
      if (j < 0 || j >= f.modules.length) return f
      const modules = [...f.modules]
      ;[modules[i], modules[j]] = [modules[j], modules[i]]
      return { ...f, modules }
    })

  function submit() {
    // redator_ids NÃO entra: o backend ignora na escrita do curso.
    // modules entra SEMPRE: o backend faz replace-total, então omitir o campo
    // apagaria todos os módulos. Só os campos editáveis — sort_order e total_hours
    // são derivados no backend (do índice do array e da soma) e descartados no
    // except() da Action.
    const payload = {
      name: form.name,
      technical_name: form.technical_name,
      description: form.description,
      workload_hours: form.workload_hours,
      modules: form.modules.map((m) => ({
        name: m.name,
        learnings: m.learnings,
        contents: m.contents,
        theory_hours: m.theory_hours,
        practice_hours: m.practice_hours,
      })),
    }

    if (mode === 'create') {
      // Curso já criado numa tentativa anterior: só re-sincroniza a habilitação.
      if (createdIdRef.current !== null) {
        sync.mutate({ courseId: createdIdRef.current, redator_ids: form.redator_ids }, { onSuccess: onDone })
        return
      }
      create.mutate(payload, {
        onSuccess: (created) => {
          createdIdRef.current = created.id!
          // Sem redatores escolhidos, não dispara a 2ª chamada à toa.
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
    addModule, removeModule, patchModule, moveModule,
    pending: create.isPending || update.isPending || sync.isPending,
    fieldErrors, generalError,
  }
}
