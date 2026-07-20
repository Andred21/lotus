import { useTranslation } from 'react-i18next'
import { AppButton, AppInputText, AppRadioButton, NestedField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

/** Lista de contatos do cliente. `key={i}` (não `id`): o backend replace-total
 * recria os nested e o id muda a cada save — o índice é a identidade estável. */
export function ContactFields({
  contacts, readOnly, fieldErrors, onPatch, onSetPrimary, onAdd,
}: {
  contacts: ClientData['contacts']
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (i: number, patch: Partial<ClientData['contacts'][number]>) => void
  onSetPrimary: (i: number) => void
  onAdd: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      {contacts.map((c, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-start gap-2">
          <div className="flex h-10.5 items-center" title={t('client.contactPrimary')}>
            <AppRadioButton
              name="primaryContact"
              checked={c.is_primary}
              disabled={readOnly}
              aria-label={t('client.contactPrimary')}
              onChange={() => onSetPrimary(i)}
            />
          </div>
          <NestedField error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
            <AppInputText placeholder={t('client.contactName')} value={c.name} disabled={readOnly} onChange={(e) => onPatch(i, { name: e.target.value })} />
          </NestedField>
          <NestedField error={fieldErrors?.[`contacts.${i}.job_title`]?.[0]}>
            <AppInputText placeholder={t('client.contactJobTitle')} value={c.job_title ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { job_title: e.target.value })} />
          </NestedField>
          <NestedField error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
            <AppInputText placeholder={t('common.email')} value={c.email ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { email: e.target.value })} />
          </NestedField>
          <NestedField error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
            <AppInputText placeholder={t('common.phone')} value={c.phone ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { phone: e.target.value })} />
          </NestedField>
        </div>
      ))}
      {!readOnly && (
        <AppButton label={t('client.addContact')} icon="pi pi-user-plus" text onClick={onAdd} />
      )}
    </>
  )
}
