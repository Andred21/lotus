import { useEntityForm, useMutationErrors } from '@shared/hooks'
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
  const { form, setForm, set, readOnly } = useEntityForm(client, mode, EMPTY)
  const create = clientsApi.useCreate()
  const update = clientsApi.useUpdate()

  function submit() {
    // Empresa não tem nome separado da razón social: `name` (exigido pelo
    // backend para o `users.name` do login provisionado) é sempre igual a
    // `legal_name`, copiado aqui no submit em vez de um campo de UI dedicado.
    const payload = { ...form, name: form.legal_name }

    if (mode === 'create') {
      create.mutate(payload, { onSuccess: onDone })
      return
    }
    update.mutate({ id: client!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, setForm, readOnly, submit,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
