import { useTranslation } from 'react-i18next'
import { AppDropdown, AppInputText, PhoneInput, RutInput, type FieldComponent } from '@shared/ui'
import { formatPhoneDisplay } from '@shared/lib'
import { TETOS_IMPRESSOS } from '@shared/config/tetosImpressos'
import type { RedatorFormFields } from '../../hooks/useRedatorForm'

/** Os quatro campos de identificação do redator, em duas colunas a partir de
 * `sm`: Nome │ RUT e E-mail │ Teléfono (bloco 43).
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o redator tem o acesso abaixo do telefone; o aluno, a
 * empresa fora do grid), e unificá-los mudaria o que três telas renderizam.
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={t('redator.name')} required>
          <AppInputText className="w-full" maxLength={TETOS_IMPRESSOS.nomeAssinante} />
        </Field>

        <Field name="rut" label={t('common.rut')} required>
          <RutInput className="w-full" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Abaixo de `xl`, meia linha deixava o número com 26px a 640px: email e
            telefone tomam a linha inteira até lá (pedido do João, bloco 60). */}
        <div className="sm:col-span-2 xl:col-span-1">
          <Field name="email" label={t('common.email')} required>
            <AppInputText className="w-full" />
          </Field>
        </div>

        <div className="sm:col-span-2 xl:col-span-1">
          <Field name="phone" label={t('common.phone')} value={formatPhoneDisplay(form.phone)}>
            <PhoneInput />
          </Field>
        </div>

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
