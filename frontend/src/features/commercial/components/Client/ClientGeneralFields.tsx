import { useTranslation } from 'react-i18next'
import { AppInputText, AppDropdown, type FieldComponent } from '@shared/ui'
import type { ClientFormFields } from '../../hooks/useClientForm'

const TYPE_VALUES = ['client', 'provider', 'other'] as const

/** Dados gerais da empresa: razón social, RUT, email, tipo e giro. Subcomponente
 * local de `commercial` (não `shared/ui`): tem vocabulário de domínio. A foto
 * fica no diálogo — quem a alimenta é o `useEntityPhoto` de lá.
 *
 * `form` entra além do `Field` por UM motivo: em leitura o tipo mostra o rótulo
 * traduzido, não o código cru, e a apresentação precisa do valor. `set`,
 * `readOnly` e `fieldErrors` não entram — o `Field` os traz. */
export function ClientGeneralFields({
  Field, form,
}: {
  Field: FieldComponent<ClientFormFields>
  form: ClientFormFields
}) {
  const { t } = useTranslation()
  const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))

  return (
    <>
      {/* Empresa não tem "nome" separado da razón social — `name` (exigido pelo
          backend) é derivado de `legal_name` no submit, e o 422 pode voltar com
          a chave do derivado. O mapeamento vive no `useClientForm`. */}
      <Field name="legal_name" label={t('client.legalName')}>
        <AppInputText className="w-full" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="rut" label={t('common.rut')}>
          <AppInputText className="w-full" />
        </Field>
        <Field name="email" label={t('common.email')}>
          <AppInputText className="w-full" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="type"
          label={t('client.type')}
          value={t(`clientType.${form.type}`)}
        >
          <AppDropdown options={types} />
        </Field>
        <Field name="business_activity" label={t('client.businessActivity')}>
          <AppInputText className="w-full" />
        </Field>
      </div>
    </>
  )
}
