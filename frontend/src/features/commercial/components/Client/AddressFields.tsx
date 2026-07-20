import { useTranslation } from 'react-i18next'
import { AppInputText, AppDropdown, FormField } from '@shared/ui'
import { CHILE_REGIONS } from '@shared/lib'
import type { ClientAddressData } from '@shared/types/generated'

/** Bloco de endereço do cliente. Só o 1º endereço é editável nesta tela; o
 * dono (ClientDialog via useClientForm) preserva os demais. */
export function AddressFields({
  value, readOnly, onChange,
}: {
  value: ClientAddressData
  readOnly: boolean
  onChange: (patch: Partial<ClientAddressData>) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField label={t('client.region')}>
        <AppDropdown value={value.region} options={CHILE_REGIONS} disabled={readOnly} onChange={(e) => onChange({ region: e.value })} />
      </FormField>
      <FormField label={t('client.commune')}>
        <AppInputText value={value.commune ?? ''} disabled={readOnly} onChange={(e) => onChange({ commune: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.city')}>
        <AppInputText value={value.city ?? ''} disabled={readOnly} onChange={(e) => onChange({ city: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.street')}>
        <AppInputText value={value.line1 ?? ''} disabled={readOnly} onChange={(e) => onChange({ line1: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.complement')}>
        <AppInputText value={value.line2 ?? ''} disabled={readOnly} onChange={(e) => onChange({ line2: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.number')}>
        <AppInputText value={value.number ?? ''} disabled={readOnly} onChange={(e) => onChange({ number: e.target.value })} className="w-full" />
      </FormField>
    </div>
  )
}
