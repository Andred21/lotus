import { useTranslation } from 'react-i18next'
import { AppButton, AppCard, AppInputText, AppRadioButton, AppTag, FormField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

/** Um contato do cliente. O principal usa `tone="info"` do AppCard mais um
 * AppTag: antes, "principal" era só um radio com `title`, invisível sem hover.
 * Os campos usam FormField (label + erro) e não NestedField, que por contrato
 * não tem label — o rótulo só existia como placeholder, que some ao digitar.
 *
 * `index` entra porque a chave do erro é posicional (`contacts.<i>.<campo>`),
 * como o 422 do backend a devolve. */
export function ContactCard({
  contact, index, readOnly, isLast, fieldErrors, onPatch, onSetPrimary, onRemove,
}: {
  contact: ClientData['contacts'][number]
  index: number
  readOnly: boolean
  isLast: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (patch: Partial<ClientData['contacts'][number]>) => void
  onSetPrimary: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()

  return (
    <AppCard tone={contact.is_primary ? 'info' : 'neutral'}>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            {/* Único controle que segue desabilitado em leitura (não convertido para
                FormField/NestedField): rádio de contato principal não é valor truncado
                e o estado já é legível pela marcação (spec §4.1). */}
            {/* eslint-disable no-restricted-syntax -- exceção declarada acima; o atributo
                `disabled` fica em linha própria, então eslint-disable-next-line não o cobre */}
            <AppRadioButton
              name="primaryContact"
              checked={contact.is_primary}
              disabled={readOnly}
              aria-label={t('client.contactPrimary')}
              onChange={onSetPrimary}
            />
            {/* eslint-enable no-restricted-syntax */}
            {contact.is_primary && (
              <AppTag value={t('client.contactPrimaryTag')} severity="info" />
            )}
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
                onClick={onRemove}
              />
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label={t('client.contactName')}
            error={fieldErrors?.[`contacts.${index}.name`]?.[0]}
            readOnly={readOnly}
            value={contact.name}
          >
            <AppInputText
              value={contact.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="w-full"
            />
          </FormField>
          <FormField
            label={t('client.contactJobTitle')}
            error={fieldErrors?.[`contacts.${index}.job_title`]?.[0]}
            readOnly={readOnly}
            value={contact.job_title ?? ''}
          >
            <AppInputText
              value={contact.job_title ?? ''}
              onChange={(e) => onPatch({ job_title: e.target.value })}
              className="w-full"
            />
          </FormField>
          <FormField
            label={t('common.email')}
            error={fieldErrors?.[`contacts.${index}.email`]?.[0]}
            readOnly={readOnly}
            value={contact.email ?? ''}
          >
            <AppInputText
              value={contact.email ?? ''}
              onChange={(e) => onPatch({ email: e.target.value })}
              className="w-full"
            />
          </FormField>
          <FormField
            label={t('common.phone')}
            error={fieldErrors?.[`contacts.${index}.phone`]?.[0]}
            readOnly={readOnly}
            value={contact.phone ?? ''}
          >
            <AppInputText
              value={contact.phone ?? ''}
              onChange={(e) => onPatch({ phone: e.target.value })}
              className="w-full"
            />
          </FormField>
        </div>
      </div>
    </AppCard>
  )
}
