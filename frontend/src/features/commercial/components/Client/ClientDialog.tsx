import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { CrudDialog, AppButton, AppInputText, AppDropdown } from '@shared/ui'
import { CHILE_REGIONS } from '@shared/lib'
import type { ClientAddressData, ClientData } from '@shared/types/generated'
import { useClientForm, type ClientDialogMode } from '../../hooks/useClientForm'

const TYPES = [
  { label: 'Cliente', value: 'client' },
  { label: 'Proveedor', value: 'provider' },
  { label: 'Otro', value: 'other' },
]

const EMPTY_ADDRESS: ClientAddressData = {
  id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true,
}

export function ClientDialog({
  visible, mode, client, onHide, onEdit,
}: {
  visible: boolean
  mode: ClientDialogMode
  client: ClientData | null
  onHide: () => void
  onEdit?: () => void
}) {
  const { form, set, setForm, readOnly, submit, pending, fieldErrors, generalError } = useClientForm(client, mode, onHide)

  // Cliente criado fora da UI (seed/API) pode não ter endereço nenhum — cai
  // para um endereço vazio em vez de quebrar ao ler `addr.region`.
  const addr = form.addresses[0] ?? EMPTY_ADDRESS

  // Só o primeiro endereço é editável nesta tela; os demais são preservados.
  // (Antes o array era reconstruído com um único elemento e o update do backend,
  // que apaga-e-recria os nested, descartava os outros endereços em silêncio.)
  const setAddr = (patch: Partial<ClientAddressData>) =>
    setForm((f) => {
      const rest = f.addresses.slice(1)
      const first = { ...(f.addresses[0] ?? EMPTY_ADDRESS), ...patch }
      return { ...f, addresses: [first, ...rest] }
    })

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? 'Nuevo cliente' : (form.legal_name || form.name)}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? 'Registrar cliente' : undefined}
    >
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}
      {/* Um 422 cujo campo não tem input nesta tela ficaria invisível e o botão
          pareceria inerte. Lista o que sobrou, para nunca falhar em silêncio. */}
      {fieldErrors && (
        <UnmappedErrors
          errors={fieldErrors}
          mapped={['legal_name', 'name', 'rut', 'email', 'type', 'business_activity']}
        />
      )}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">Datos generales</h3>
        {/* Empresa não tem "nome" separado da razón social — `name` (exigido
            pelo backend) é derivado de `legal_name` no submit. Erro de `name`
            aparece aqui pois foi este campo que o gerou. */}
        <Field label="Razón social" error={fieldErrors?.legal_name?.[0] ?? fieldErrors?.name?.[0]}>
          <AppInputText value={form.legal_name} disabled={readOnly} onChange={(e) => set('legal_name', e.target.value)} className="w-full" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="RUT" error={fieldErrors?.rut?.[0]}>
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </Field>
          <Field label="Email" error={fieldErrors?.email?.[0]}>
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <AppDropdown value={form.type} options={TYPES} disabled={readOnly} onChange={(e) => set('type', e.value)} />
          </Field>
          <Field label="Giro">
            <AppInputText value={form.business_activity ?? ''} disabled={readOnly} onChange={(e) => set('business_activity', e.target.value)} className="w-full" />
          </Field>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Dirección</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Región">
            <AppDropdown value={addr.region} options={CHILE_REGIONS} disabled={readOnly} onChange={(e) => setAddr({ region: e.value })} />
          </Field>
          <Field label="Comuna">
            <AppInputText value={addr.commune ?? ''} disabled={readOnly} onChange={(e) => setAddr({ commune: e.target.value })} className="w-full" />
          </Field>
          <Field label="Ciudad">
            <AppInputText value={addr.city ?? ''} disabled={readOnly} onChange={(e) => setAddr({ city: e.target.value })} className="w-full" />
          </Field>
          <Field label="Calle">
            <AppInputText value={addr.line1 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line1: e.target.value })} className="w-full" />
          </Field>
          <Field label="Número">
            <AppInputText value={addr.number ?? ''} disabled={readOnly} onChange={(e) => setAddr({ number: e.target.value })} className="w-full" />
          </Field>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Personas de contacto</h3>
        {form.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <NestedField error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
              <AppInputText placeholder="Nombre" value={c.name} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { name: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
              <AppInputText placeholder="Email" value={c.email ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { email: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
              <AppInputText placeholder="Teléfono" value={c.phone ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { phone: e.target.value })} />
            </NestedField>
          </div>
        ))}
        {!readOnly && (
          <AppButton
            label="Agregar contacto"
            icon="pi pi-user-plus"
            text
            onClick={() => setForm((f) => ({ ...f, contacts: [...f.contacts, { id: undefined, name: '', email: null, phone: null, is_primary: false }] }))}
          />
        )}
      </section>
    </CrudDialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

function patchContact(
  setForm: Dispatch<SetStateAction<ClientData>>,
  i: number,
  patch: Partial<ClientData['contacts'][number]>,
) {
  setForm((f) => ({ ...f, contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }))
}

/** Campo aninhado (contatos/endereços): sem label própria, mas com o erro do
 * backend visível. Sem isso, um 422 em `contacts.0.name` deixa o botão de
 * salvar aparentemente inerte. */
function NestedField({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </div>
  )
}

function UnmappedErrors({ errors, mapped }: { errors: Record<string, string[]>; mapped: string[] }) {
  // `contacts.*` é excluído porque cada um já aparece no seu NestedField.
  // `addresses.*` NÃO é excluído: os inputs de endereço ainda não recebem prop
  // `error`, então filtrá-los aqui faria o 422 desaparecer da tela. Hoje o
  // backend não valida endereço, mas o dia em que validar não pode ser o dia em
  // que o botão de salvar volta a parecer morto.
  const leftover = Object.entries(errors).filter(
    ([key]) => !mapped.includes(key) && !key.startsWith('contacts.'),
  )
  if (leftover.length === 0) return null
  return (
    <ul className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {leftover.map(([key, msgs]) => (
        <li key={key}>{msgs[0]}</li>
      ))}
    </ul>
  )
}
