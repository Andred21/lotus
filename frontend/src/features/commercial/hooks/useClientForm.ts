import { useState } from 'react'
import type { ClientData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { clientsApi } from '../api/clientsApi'

export type ClientDialogMode = DialogMode

const EMPTY: ClientData = {
  id: undefined, name: '', rut: '', email: '', phone: null,
  legal_name: '', type: 'client', business_activity: null,
  addresses: [{ id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true }],
  contacts: [{ id: undefined, name: '', email: null, phone: null, is_primary: true }],
}

export function useClientForm(client: ClientData | null, mode: ClientDialogMode, onDone: () => void) {
  const [form, setForm] = useState<ClientData>(() => (client ? structuredClone(client) : structuredClone(EMPTY)))
  const [prev, setPrev] = useState({ client, mode })
  const create = clientsApi.useCreate()
  const update = clientsApi.useUpdate()

  // Reseta o form quando `client`/`mode` mudam (troca de linha selecionada ou
  // reabertura em outro modo). Ajuste de estado durante o render — sem
  // useEffect — segue o padrão recomendado pelo React para "resetar estado
  // quando uma prop muda" (evita o setState síncrono em efeito).
  if (client !== prev.client || mode !== prev.mode) {
    setPrev({ client, mode })
    setForm(client ? structuredClone(client) : structuredClone(EMPTY))
  }

  const readOnly = mode === 'view'
  const set = <K extends keyof ClientData>(k: K, v: ClientData[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    const mutation = mode === 'create' ? create : update
    const vars = mode === 'create' ? form : { id: client!.id!, payload: form }
    mutation.mutate(vars as never, { onSuccess: onDone })
  }

  // 422 traz erros por campo; outros status trazem só a mensagem geral.
  const mutationError = create.error ?? update.error
  const fieldErrors = mutationError?.errors
  const generalError = mutationError && !mutationError.errors ? mutationError.detail : null

  return {
    form, set, setForm, readOnly, submit,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
