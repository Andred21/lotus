import { useCrudForm } from '@shared/hooks'
import type { CourseData, CourseModuleData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { coursesApi } from '@shared/api/coursesApi'
import { useSyncCourseRedatores } from '../api/useSyncCourseRedatores'

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
  const sync = useSyncCourseRedatores()

  const { crud, setForm } = useCrudForm<CourseFormFields, CourseData>(coursesApi, {
    entity,
    mode,
    empty: EMPTY,
    toFields,
    // redator_ids NÃO entra: o backend ignora na escrita do curso.
    // modules entra SEMPRE: o backend faz replace-total, então omitir o campo
    // apagaria todos os módulos. Só os campos editáveis — sort_order e
    // total_hours são derivados no backend e descartados no except() da Action.
    toPayload: (f) => ({
      name: f.name,
      technical_name: f.technical_name,
      description: f.description,
      workload_hours: f.workload_hours,
      modules: f.modules.map((m) => ({
        name: m.name,
        learnings: m.learnings,
        contents: m.contents,
        theory_hours: m.theory_hours,
        practice_hours: m.practice_hours,
      })),
    }),
    mapped: ['name', 'technical_name', 'description', 'workload_hours'],
    // `modules` é a lista inteira (cada módulo mostra o próprio erro pelo
    // prefixo). `redator_ids` NÃO está no payload do curso: é a chave que um
    // 422 do `sync` traria, e sem ela aqui o erro não teria onde aparecer.
    summaryOnly: ['modules', 'redator_ids'],
    excludePrefixes: ['modules.'],
    onDone,
    // Segunda etapa do create: a habilitação mora em endpoint dedicado. Lança
    // de propósito — é o que faz o `useCrudForm` segurar o diálogo aberto e,
    // no resubmit, re-tentar só esta etapa em vez de recriar o curso (que é
    // registro de peso legal). Em edit a habilitação é leitura.
    afterCreate: async (created) => {
      if (crud.form.redator_ids.length === 0) return
      await sync.mutateAsync({ courseId: created.id!, redator_ids: crud.form.redator_ids })
    },
    extra: [sync],
  })

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

  // Totais derivados: reagem ao que está sendo digitado, não ao último valor
  // salvo (o modules_total_hours do backend serve a consumidores de leitura).
  const modulesTotal = crud.form.modules.reduce((sum, m) => sum + m.theory_hours + m.practice_hours, 0)
  // Curso sem módulo nenhum não é divergência — é curso sem módulo cadastrado.
  const hoursMismatch = crud.form.modules.length > 0 && modulesTotal !== crud.form.workload_hours

  return {
    ...crud,
    toggleRedator,
    addModule, removeModule, patchModule, moveModule,
    modulesTotal, hoursMismatch,
  }
}
