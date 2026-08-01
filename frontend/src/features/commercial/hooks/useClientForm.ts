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
  photo_url: null,
  addresses: [{ ...EMPTY_ADDRESS }],
  contacts: [{ ...EMPTY_CONTACT, is_primary: true }],
}

export function useClientForm(
  client: ClientData | null,
  mode: ClientDialogMode,
  onDone: () => void,
  afterCreate?: (created: ClientData) => Promise<void>,
) {
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

  /** Remove o contato do índice. Não deixa a lista vazia: o backend exige ao
   * menos um (spec D13) e a UI desabilita o botão nesse caso — esta guarda é
   * a rede, não a regra. Se o removido era o principal, o primeiro que sobra
   * assume, para a lista nunca ficar sem principal por efeito colateral. */
  const removeContact = (i: number) =>
    setForm((f) => {
      if (f.contacts.length <= 1) return f

      const rest = f.contacts.filter((_, idx) => idx !== i)
      const hasPrimary = rest.some((c) => c.is_primary)

      return {
        ...f,
        contacts: hasPrimary ? rest : rest.map((c, idx) => ({ ...c, is_primary: idx === 0 })),
      }
    })

  function submit() {
    // Empresa não tem nome separado da razón social: `name` (exigido pelo backend
    // para o `users.name` do login provisionado) é sempre igual a `legal_name`.
    //
    // Campos LISTADOS, não `...form`: `photo_url` é `#[Computed]` e não tem o
    // que fazer num payload de escrita — hoje o backend o ignora (a promoção
    // no construtor do `ClientData` desvia do `CannotSetComputedValue`, medido
    // em 2026-08-01: PUT com `photo_url` devolve 200), mas mandar campo de
    // saída no corpo da escrita depende desse detalhe do pacote para não
    // virar 500. Os outros 3 forms já montam o payload explícito.
    const payload = {
      id: form.id,
      name: form.legal_name,
      legal_name: form.legal_name,
      rut: form.rut,
      email: form.email,
      phone: form.phone,
      type: form.type,
      business_activity: form.business_activity,
      addresses: form.addresses,
      contacts: form.contacts,
    }
    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: async (created) => {
          await afterCreate?.(created)
          onDone()
        },
      })
      return
    }
    update.mutate({ id: client!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, readOnly, submit,
    setAddr, patchContact, setPrimaryContact, addContact, removeContact,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
