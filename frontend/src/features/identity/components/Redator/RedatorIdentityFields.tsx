import { useTranslation } from 'react-i18next'
import { AppDropdown, AppInputText, type FieldComponent } from '@shared/ui'
import type { RedatorFormFields } from '../../hooks/useRedatorForm'

/** Os quatro campos de identificação do redator, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam.
 *
 * `form` entra além do `Field` por UM motivo: o campo de acesso só existe em
 * redator já existente (`form.id !== undefined`), e essa condição — e o
 * rótulo traduzido em leitura — precisam do valor cru do form. */
export function RedatorIdentityFields({
  Field,
  form,
}: {
  Field: FieldComponent<RedatorFormFields>
  form: RedatorFormFields
}) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-1">
        <Field name="name" label={t('redator.name')}>
          <AppInputText className="w-full" />
        </Field>

        <Field name="rut" label={t('common.rut')}>
          <AppInputText className="w-full" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label={t('common.email')}>
          <AppInputText className="w-full" />
        </Field>

        <Field name="phone" label={t('common.phone')}>
          <AppInputText className="w-full" />
        </Field>

        {/* Só em redator já existente: no cadastro o acesso nasce ativo pelo
            `UserProvisioner`, e um controle que o POST ignora mentiria. Molde
            de `StaffUserDialog` — não existe `AppSwitch` em `shared/ui` e
            feature não importa PrimeReact direto (lei §5.6). */}
        {form.id !== undefined && (
          <Field
            name="is_active"
            label={t('redator.accessState')}
            value={(form.is_active ?? true) ? t('common.active') : t('common.inactive')}
          >
            <AppDropdown
              options={[
                { label: t('common.active'), value: true },
                { label: t('common.inactive'), value: false },
              ]}
              optionLabel="label"
              optionValue="value"
            />
          </Field>
        )}
      </div>
    </>
  )
}
