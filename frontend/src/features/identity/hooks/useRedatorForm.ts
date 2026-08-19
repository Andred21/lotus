import { useState } from 'react'
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { RedatorData } from '@shared/types/generated'
import type { DialogMode, DocType } from '@shared/lib'
import { redatoresApi } from '@shared/api/redatoresApi'

export type RedatorDialogMode = DialogMode

/**
 * Só os campos que o formulário edita. `documents` NÃO entra aqui: eles são
 * geridos por mutações próprias contra o servidor e lidos da entidade viva.
 */
/** `is_active` é o acesso do usuário-redator, e só o UPDATE o escreve: no
 * cadastro o redator nasce ativo pelo `UserProvisioner` (RN-01), então mandar
 * o campo no POST daria ao formulário um controle que o backend ignora.
 * `undefined` (o `Optional` do DTO) vale como ativo — é o default do cadastro. */
export type RedatorFormFields = Pick<
  RedatorData,
  'id' | 'name' | 'rut' | 'email' | 'phone' | 'course_ids' | 'is_active'
>

const EMPTY: RedatorFormFields = {
  id: undefined, name: '', rut: '', email: '', phone: null, course_ids: [], is_active: true,
}

const toFields = (r: RedatorFormFields): RedatorFormFields => {
  const { id, name, rut, email, phone, course_ids, is_active } = r
  return structuredClone({ id, name, rut, email, phone, course_ids, is_active: is_active ?? true })
}

export function useRedatorForm(
  redator: RedatorData | null,
  mode: RedatorDialogMode,
  onDone: () => void,
  afterCreate?: (created: RedatorData) => Promise<void>,
) {
  const { form, set, setForm, readOnly, didReset } = useEntityForm<RedatorFormFields>(redator, mode, EMPTY, toFields)

  // Documentos escolhidos no `create`: ficam no estado local até o submit (não
  // há `redator.id` ainda para subir pelo endpoint aninhado). Limpo junto com
  // o reset do núcleo (mesmo padrão de setState condicional no render), com a
  // guarda de tamanho para não regerar o objeto e disparar um loop de renders.
  const [stagedDocs, setStagedDocs] = useState<Partial<Record<DocType, File>>>({})
  if (didReset && Object.keys(stagedDocs).length > 0) setStagedDocs({})

  const create = redatoresApi.useCreate()
  const update = redatoresApi.useUpdate()

  // Updater funcional: dois toggles no mesmo tick (um "marcar todos" futuro, ou
  // dois cliques batched) precisam ver o array já atualizado pelo anterior. Ler
  // `form.course_ids` do closure perderia a primeira das duas atualizações.
  const toggleCourse = (id: number) =>
    setForm((f) => ({
      ...f,
      course_ids: f.course_ids.includes(id)
        ? f.course_ids.filter((x) => x !== id)
        : [...f.course_ids, id],
    }))

  const stageDoc = (type: DocType, file: File) => setStagedDocs((s) => ({ ...s, [type]: file }))
  const unstageDoc = (type: DocType) =>
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
      create.mutate(fd, {
        onSuccess: async (created) => {
          await afterCreate?.(created)
          onDone()
        },
      })
      return
    }
    const payload = {
      name: form.name, rut: form.rut, email: form.email, phone: form.phone,
      course_ids: form.course_ids, is_active: form.is_active ?? true,
    }
    update.mutate({ id: redator!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, toggleCourse, readOnly, submit,
    pending: create.isPending || update.isPending,
    stagedDocs, stageDoc, unstageDoc,
    fieldErrors, generalError,
  }
}
