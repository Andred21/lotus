import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'
import { ContactCard } from './ContactCard'

/** Lista de contatos do cliente. `key={i}` (não `id`): o backend replace-total
 * recria os nested e o id muda a cada save — o índice é a identidade estável.
 * Cada contato é um card (spec D12). */
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
        <ContactCard
          key={i}
          contact={c}
          index={i}
          readOnly={readOnly}
          isLast={isLast}
          fieldErrors={fieldErrors}
          onPatch={(patch) => onPatch(i, patch)}
          onSetPrimary={() => onSetPrimary(i)}
          onRemove={() => onRemove(i)}
        />
      ))}

      {!readOnly && (
        <AppButton
          label={t('client.addContact')}
          icon="pi pi-user-plus"
          text
          onClick={onAdd}
        />
      )}
    </div>
  )
}
