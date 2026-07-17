import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppDropdown, AppRadioButton, FormField, NestedField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import { CHILE_REGIONS } from '@shared/lib'
import type { ClientAddressData, ClientData } from '@shared/types/generated'
import { useClientForm, type ClientDialogMode } from '../../hooks/useClientForm'

const TYPE_VALUES = ['client', 'provider', 'other'] as const

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
  const { t } = useTranslation()
  const { form, set, setForm, readOnly, submit, pending, fieldErrors, generalError } = useClientForm(client, mode, onHide)
  const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))

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
      title={mode === 'create' ? t('client.new') : (form.legal_name || form.name)}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? t('client.create') : undefined}
    >
      <FormErrorBanner message={generalError} />
      {/* `contacts.*` sai do resumo (cada contato mostra o próprio erro no
          NestedField); `addresses.*` NÃO — hoje o backend não valida endereço,
          mas quando validar o 422 não pode sumir da tela. */}
      <FormErrorSummary
        errors={fieldErrors}
        mapped={['legal_name', 'name', 'rut', 'email', 'type', 'business_activity']}
        excludePrefixes={['contacts.']}
      />
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">{t('client.sectionGeneral')}</h3>
        {/* Empresa não tem "nome" separado da razón social — `name` (exigido
            pelo backend) é derivado de `legal_name` no submit. Erro de `name`
            aparece aqui pois foi este campo que o gerou. */}
        <FormField label={t('client.legalName')} error={fieldErrors?.legal_name?.[0] ?? fieldErrors?.name?.[0]}>
          <AppInputText value={form.legal_name} disabled={readOnly} onChange={(e) => set('legal_name', e.target.value)} className="w-full" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]}>
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </FormField>
          <FormField label={t('common.email')} error={fieldErrors?.email?.[0]}>
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('client.type')}>
            <AppDropdown value={form.type} options={types} disabled={readOnly} onChange={(e) => set('type', e.value)} />
          </FormField>
          <FormField label={t('client.businessActivity')}>
            <AppInputText value={form.business_activity ?? ''} disabled={readOnly} onChange={(e) => set('business_activity', e.target.value)} className="w-full" />
          </FormField>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionAddress')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('client.region')}>
            <AppDropdown value={addr.region} options={CHILE_REGIONS} disabled={readOnly} onChange={(e) => setAddr({ region: e.value })} />
          </FormField>
          <FormField label={t('client.commune')}>
            <AppInputText value={addr.commune ?? ''} disabled={readOnly} onChange={(e) => setAddr({ commune: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.city')}>
            <AppInputText value={addr.city ?? ''} disabled={readOnly} onChange={(e) => setAddr({ city: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.street')}>
            <AppInputText value={addr.line1 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line1: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.complement')}>
            <AppInputText value={addr.line2 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line2: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.number')}>
            <AppInputText value={addr.number ?? ''} disabled={readOnly} onChange={(e) => setAddr({ number: e.target.value })} className="w-full" />
          </FormField>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionContacts')}</h3>
        {form.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-start gap-2">
            <div className="flex h-[42px] items-center" title={t('client.contactPrimary')}>
              <AppRadioButton
                name="primaryContact"
                checked={c.is_primary}
                disabled={readOnly}
                aria-label={t('client.contactPrimary')}
                onChange={() => setPrimaryContact(setForm, i)}
              />
            </div>
            <NestedField error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
              <AppInputText placeholder={t('client.contactName')} value={c.name} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { name: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.job_title`]?.[0]}>
              <AppInputText placeholder={t('client.contactJobTitle')} value={c.job_title ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { job_title: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
              <AppInputText placeholder={t('common.email')} value={c.email ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { email: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
              <AppInputText placeholder={t('common.phone')} value={c.phone ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { phone: e.target.value })} />
            </NestedField>
          </div>
        ))}
        {!readOnly && (
          <AppButton
            label={t('client.addContact')}
            icon="pi pi-user-plus"
            text
            onClick={() => setForm((f) => ({ ...f, contacts: [...f.contacts, { id: undefined, name: '', job_title: null, email: null, phone: null, is_primary: false }] }))}
          />
        )}
      </section>
    </CrudDialog>
  )
}

function patchContact(
  setForm: Dispatch<SetStateAction<ClientData>>,
  i: number,
  patch: Partial<ClientData['contacts'][number]>,
) {
  setForm((f) => ({ ...f, contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }))
}

function setPrimaryContact(setForm: Dispatch<SetStateAction<ClientData>>, i: number) {
  setForm((f) => ({
    ...f,
    contacts: f.contacts.map((c, idx) => ({ ...c, is_primary: idx === i })),
  }))
}
