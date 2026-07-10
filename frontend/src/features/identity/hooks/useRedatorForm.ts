import { useState } from 'react'
import type { RedatorData } from '@shared/types/generated'
import { redatoresApi } from '../api/redatoresApi'
import type { DialogMode } from '@shared/lib'

export type RedatorDialogMode = DialogMode

/**
 * Só os campos que o formulário edita. `documents` NÃO entra aqui: eles são
 * geridos por mutações próprias contra o servidor e lidos da entidade viva.
 */
export type RedatorFormFields = Pick<RedatorData, 'id' | 'name' | 'rut' | 'email' | 'phone' | 'course_ids'>

const EMPTY: RedatorFormFields = {
  id: undefined, name: '', rut: '', email: '', phone: null, course_ids: [],
}

function toFields(r: RedatorData): RedatorFormFields {
  const { id, name, rut, email, phone, course_ids } = r
  return structuredClone({ id, name, rut, email, phone, course_ids })
}

export function useRedatorForm(redator: RedatorData | null, mode: RedatorDialogMode, onDone: () => void) {
  const [form, setForm] = useState<RedatorFormFields>(() => (redator ? toFields(redator) : structuredClone(EMPTY)))
  // Documentos iniciais escolhidos no `create`: ficam só no estado local até o
  // submit (não há `redator.id` ainda para subir por multipart aninhado).
  const [stagedDocs, setStagedDocs] = useState<Record<string, File>>({})
  const [prev, setPrev] = useState({ id: redator?.id ?? null, mode })
  const create = redatoresApi.useCreate()
  const update = redatoresApi.useUpdate()

  // Reseta quando muda a ENTIDADE (id) ou o modo — não quando muda a identidade
  // do objeto. A entidade é derivada da lista, então um refetch (disparado por
  // upload/remoção de documento) produz um objeto novo com o mesmo id; resetar
  // ali apagaria o que o usuário digitou e ainda não salvou.
  // Ajuste de estado durante o render — sem useEffect — segue o padrão
  // recomendado pelo React para "resetar estado quando uma prop muda" (evita o
  // setState síncrono em efeito, proibido por react-hooks/set-state-in-effect
  // nesta versão do eslint-plugin-react-hooks).
  const currentId = redator?.id ?? null
  if (currentId !== prev.id || mode !== prev.mode) {
    setPrev({ id: currentId, mode })
    setForm(redator ? toFields(redator) : structuredClone(EMPTY))
    setStagedDocs({})
  }

  const readOnly = mode === 'view'
  const set = <K extends keyof RedatorFormFields>(k: K, v: RedatorFormFields[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCourse = (id: number) =>
    setForm((f) => {
      const ids = f.course_ids
      return { ...f, course_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] }
    })

  const stageDoc = (type: string, file: File) => setStagedDocs((s) => ({ ...s, [type]: file }))
  const unstageDoc = (type: string) =>
    setStagedDocs((s) => {
      const next = { ...s }
      delete next[type]
      return next
    })

  function submit() {
    if (mode === 'create') {
      // Um único POST multipart: dados do usuário + cursos + documentos
      // tipados iniciais, já que o backend lê os arquivos de
      // `$request->file('documents')` keyed por tipo.
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('rut', form.rut)
      fd.append('email', form.email)
      if (form.phone) fd.append('phone', form.phone)
      form.course_ids.forEach((id) => fd.append('course_ids[]', String(id)))
      Object.entries(stagedDocs).forEach(([type, file]) => fd.append(`documents[${type}]`, file))
      create.mutate(fd, { onSuccess: onDone })
      return
    }
    const payload = { name: form.name, rut: form.rut, email: form.email, phone: form.phone, course_ids: form.course_ids }
    update.mutate({ id: redator!.id!, payload }, { onSuccess: onDone })
  }

  // 422 traz erros por campo; outros status trazem só a mensagem geral.
  const mutationError = create.error ?? update.error
  const fieldErrors = mutationError?.errors
  const generalError = mutationError && !mutationError.errors ? mutationError.detail : null

  return {
    form, set, toggleCourse, readOnly, submit,
    pending: create.isPending || update.isPending,
    stagedDocs, stageDoc, unstageDoc,
    fieldErrors, generalError,
  }
}
