import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { AppDialog, AppButton, AppInputText, AppDropdown } from '@shared/ui'
import { CHILE_REGIONS } from '@shared/lib'
import type { ClientAddressData, ClientData } from '@shared/types/generated'
import { useClientForm, type ClientDialogMode } from '../hooks/useClientForm'

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
  const title = mode === 'create' ? 'Nuevo cliente' : form.legal_name || form.name
  const header = (
    <div className="flex items-center justify-between gap-4 pr-6">
      <span>{title}</span>
      {readOnly && onEdit && <AppButton label="Editar" icon="pi pi-pencil" outlined onClick={onEdit} />}
    </div>
  )

  // Cliente criado fora da UI (seed/API) pode não ter endereço nenhum — cai
  // para um endereço vazio em vez de quebrar ao ler `addr.region`.
  const addr = form.addresses[0] ?? EMPTY_ADDRESS
  const setAddr = (patch: Partial<ClientAddressData>) =>
    setForm((f) => ({ ...f, addresses: [{ ...(f.addresses[0] ?? EMPTY_ADDRESS), ...patch }] }))

  const footer = readOnly ? null : (
    <div className="flex justify-end gap-2">
      <AppButton label="Cancelar" text onClick={onHide} />
      <AppButton label={mode === 'create' ? 'Registrar cliente' : 'Guardar'} icon="pi pi-check" loading={pending} onClick={submit} />
    </div>
  )

  return (
    <AppDialog header={header} visible={visible} onHide={onHide} footer={footer}>
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">Datos generales</h3>
        <Field label="Nombre" error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </Field>
        <Field label="Razón social" error={fieldErrors?.legal_name?.[0]}>
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
            <AppInputText placeholder="Nombre" value={c.name} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { name: e.target.value })} />
            <AppInputText placeholder="Email" value={c.email ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { email: e.target.value })} />
            <AppInputText placeholder="Teléfono" value={c.phone ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { phone: e.target.value })} />
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
    </AppDialog>
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
