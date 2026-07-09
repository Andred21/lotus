import { useState } from 'react'
import type { RedatorData } from '@shared/types/generated'
import { redatoresApi } from '../api/redatoresApi'
import type { DialogMode } from '@shared/lib'

export type RedatorDialogMode = DialogMode

const EMPTY: RedatorData = {
  id: undefined, name: '', rut: '', email: '', phone: null, course_ids: [], documents: [],
}

export function useRedatorForm(redator: RedatorData | null, mode: RedatorDialogMode, onDone: () => void) {
  const [form, setForm] = useState<RedatorData>(() => (redator ? structuredClone(redator) : structuredClone(EMPTY)))
  const [prev, setPrev] = useState({ redator, mode })
  const create = redatoresApi.useCreate()
  const update = redatoresApi.useUpdate()

  // Reseta o form quando `redator`/`mode` mudam (troca de linha selecionada ou
  // reabertura em outro modo). Ajuste de estado durante o render — sem
  // useEffect — segue o padrão recomendado pelo React para "resetar estado
  // quando uma prop muda" (evita o setState síncrono em efeito, proibido por
  // react-hooks/set-state-in-effect nesta versão do eslint-plugin-react-hooks).
  if (redator !== prev.redator || mode !== prev.mode) {
    setPrev({ redator, mode })
    setForm(redator ? structuredClone(redator) : structuredClone(EMPTY))
  }

  const readOnly = mode === 'view'
  const set = <K extends keyof RedatorData>(k: K, v: RedatorData[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCourse = (id: number) =>
    setForm((f) => {
      const ids = f.course_ids
      return { ...f, course_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] }
    })

  function submit() {
    const payload = { name: form.name, rut: form.rut, email: form.email, phone: form.phone, course_ids: form.course_ids }
    const mutation = mode === 'create' ? create : update
    const vars = mode === 'create' ? payload : { id: redator!.id!, payload }
    mutation.mutate(vars as never, { onSuccess: onDone })
  }

  return { form, set, toggleCourse, readOnly, submit, pending: create.isPending || update.isPending }
}
