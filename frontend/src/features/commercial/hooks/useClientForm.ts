import { useCrudForm } from '@shared/hooks'
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
  const { crud, setForm } = useCrudForm<ClientData, ClientData>(clientsApi, {
    entity: client,
    mode,
    empty: EMPTY,
    // Campos LISTADOS, não `...form`: `photo_url` é `#[Computed]` e não tem o
    // que fazer num payload de escrita. Empresa não tem nome separado da razón
    // social: `name` é sempre igual a `legal_name`.
    toPayload: (f) => ({
      id: f.id,
      name: f.legal_name,
      legal_name: f.legal_name,
      rut: f.rut,
      email: f.email,
      phone: f.phone,
      type: f.type,
      business_activity: f.business_activity,
      addresses: f.addresses,
      contacts: f.contacts,
    }),
    mapped: ['legal_name', 'name', 'rut', 'email', 'type', 'business_activity'],
    // `contacts.*` sai do resumo pelo prefixo (cada contato mostra o próprio
    // erro no NestedField), mas a chave `contacts` — a lista inteira — não é
    // coberta por ele. `addresses` NÃO entra em `mapped`: hoje o backend não
    // valida endereço, e quando validar o 422 não pode sumir da tela.
    summaryOnly: ['id', 'phone', 'addresses', 'contacts'],
    excludePrefixes: ['contacts.'],
    onDone,
    afterCreate,
  })

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

  return {
    ...crud,
    // Cliente criado fora da UI (seed/API) pode não ter endereço — cai para o
    // vazio em vez de quebrar ao ler `addr.region`. Resolvido aqui porque a
    // constante que define "endereço vazio" já mora neste arquivo; tê-la também
    // no componente eram duas fontes para o mesmo default.
    addr: crud.form.addresses[0] ?? EMPTY_ADDRESS,
    setAddr,
    patchContact,
    setPrimaryContact,
    addContact,
    removeContact,
  }
}
