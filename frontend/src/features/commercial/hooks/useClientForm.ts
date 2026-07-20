import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { ClientAddressData, ClientData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { clientsApi } from '@shared/api/clientsApi'

export type ClientDialogMode = DialogMode

const EMPTY_ADDRESS: ClientAddressData = {
  id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true,
}

const EMPTY_CONTACT: ClientData['contacts'][number] = {
  id: undefined, name: '', job_title: null, email: null, phone: null, is_primary: false,
}

const EMPTY: ClientData = {
  id: undefined, name: '', rut: '', email: '', phone: null,
  legal_name: '', type: 'client', business_activity: null,
  addresses: [{ ...EMPTY_ADDRESS }],
  contacts: [{ ...EMPTY_CONTACT, is_primary: true }],
}

export function useClientForm(client: ClientData | null, mode: ClientDialogMode, onDone: () => void) {
  const { form, setForm, set, readOnly } = useEntityForm(client, mode, EMPTY)
  const create = clientsApi.useCreate()
  const update = clientsApi.useUpdate()

  // Só o primeiro endereço é editável nesta tela; os demais são preservados.
  // (O update do backend apaga-e-recria os nested; reconstruir o array com um
  // único elemento descartaria os outros endereços em silêncio.)
  const setAddr = (patch: Partial<ClientAddressData>) =>
    setForm((f) => {
      const first = { ...(f.addresses[0] ?? EMPTY_ADDRESS), ...patch }
      return { ...f, addresses: [first, ...f.addresses.slice(1)] }
    })

  const patchContact = (i: number, patch: Partial<ClientData['contacts'][number]>) =>
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }))

  const setPrimaryContact = (i: number) =>
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, idx) => ({ ...c, is_primary: idx === i })) }))

  const addContact = () =>
    setForm((f) => ({ ...f, contacts: [...f.contacts, { ...EMPTY_CONTACT }] }))

  function submit() {
    // Empresa não tem nome separado da razón social: `name` (exigido pelo backend
    // para o `users.name` do login provisionado) é sempre igual a `legal_name`.
    const payload = { ...form, name: form.legal_name }
    if (mode === 'create') {
      create.mutate(payload, { onSuccess: onDone })
      return
    }
    update.mutate({ id: client!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, readOnly, submit,
    setAddr, patchContact, setPrimaryContact, addContact,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
