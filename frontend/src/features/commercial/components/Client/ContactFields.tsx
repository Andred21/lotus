import { useTranslation } from 'react-i18next'
import { AppButton, AppCard, AppInputText, AppRadioButton, AppTag, FormField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

/** Lista de contatos do cliente. `key={i}` (não `id`): o backend replace-total
 * recria os nested e o id muda a cada save — o índice é a identidade estável.
 *
 * Cada contato é um card (spec D12). O principal usa `tone="info"` do próprio
 * AppCard mais um AppTag: antes, "principal" era só um radio com `title`,
 * invisível sem hover. Os campos usam FormField (label + erro) e não
 * NestedField, que por contrato não tem label — o rótulo só existia como
 * placeholder, que some ao digitar. */
export function ContactFields({
  contacts, readOnly, fieldErrors, onPatch, onSetPrimary, onAdd, onRemove,
}: {
  contacts: ClientData['contacts']
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (i: number, patch: Partial<ClientData['contacts'][number]>) => void
  onSetPrimary: (i: number) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const { t } = useTranslation()
  const isLast = contacts.length <= 1

  return (
    <div className="space-y-3">
      {contacts.map((c, i) => (
        <AppCard key={i} tone={c.is_primary ? 'info' : 'neutral'}>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <AppRadioButton
                  name="primaryContact"
                  checked={c.is_primary}
                  disabled={readOnly}
                  aria-label={t('client.contactPrimary')}
                  onChange={() => onSetPrimary(i)}
                />
                <span>{t('client.contactPrimary')}</span>
                {c.is_primary && <AppTag value={t('client.contactPrimaryTag')} severity="info" />}
              </label>

              {!readOnly && (
                <span title={isLast ? t('client.lastContactHint') : t('client.removeContact')}>
                  <AppButton
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    disabled={isLast}
                    aria-label={t('client.removeContact')}
                    onClick={() => onRemove(i)}
                  />
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t('client.contactName')} error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
                <AppInputText value={c.name} disabled={readOnly} onChange={(e) => onPatch(i, { name: e.target.value })} className="w-full" />
              </FormField>
              <FormField label={t('client.contactJobTitle')} error={fieldErrors?.[`contacts.${i}.job_title`]?.[0]}>
                <AppInputText value={c.job_title ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { job_title: e.target.value })} className="w-full" />
              </FormField>
              <FormField label={t('common.email')} error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
                <AppInputText value={c.email ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { email: e.target.value })} className="w-full" />
              </FormField>
              <FormField label={t('common.phone')} error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
                <AppInputText value={c.phone ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { phone: e.target.value })} className="w-full" />
              </FormField>
            </div>
          </div>
        </AppCard>
      ))}

      {!readOnly && (
        <AppButton label={t('client.addContact')} icon="pi pi-user-plus" text onClick={onAdd} />
      )}
    </div>
  )
}
