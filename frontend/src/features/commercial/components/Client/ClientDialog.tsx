import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import type { ClientAddressData, ClientData } from '@shared/types/generated'
import { useClientForm, type ClientDialogMode } from '../../hooks/useClientForm'
import { AddressFields } from './AddressFields'
import { ContactFields } from './ContactFields'

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
  const { form, set, readOnly, submit, pending, fieldErrors, generalError, setAddr, patchContact, setPrimaryContact, addContact } =
    useClientForm(client, mode, onHide)
  const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))

  // Cliente criado fora da UI (seed/API) pode não ter endereço — cai para vazio
  // em vez de quebrar ao ler `addr.region`.
  const addr = form.addresses[0] ?? EMPTY_ADDRESS

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
        <AddressFields value={addr} readOnly={readOnly} onChange={setAddr} />

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionContacts')}</h3>
        <ContactFields
          contacts={form.contacts}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          onPatch={patchContact}
          onSetPrimary={setPrimaryContact}
          onAdd={addContact}
        />
      </section>
    </CrudDialog>
  )
}
