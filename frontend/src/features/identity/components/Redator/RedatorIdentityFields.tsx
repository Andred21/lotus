import { useTranslation } from 'react-i18next'
import { AppDropdown, AppInputText, FormField } from '@shared/ui'
import type { RedatorFormFields } from '../../hooks/useRedatorForm'

/** Os quatro campos de identificação do redator, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam. */
export function RedatorIdentityFields({
  form,
  set,
  readOnly,
  fieldErrors,
}: {
  form: RedatorFormFields
  set: <K extends keyof RedatorFormFields>(key: K, value: RedatorFormFields[K]) => void
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
}) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-1">
        <FormField label={t('redator.name')} error={fieldErrors?.name?.[0]} readOnly={readOnly} value={form.name}>
          <AppInputText
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full"
          />
        </FormField>

        <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]} readOnly={readOnly} value={form.rut}>
          <AppInputText
            value={form.rut}
            onChange={(e) => set('rut', e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t('common.email')}
          error={fieldErrors?.email?.[0]}
          readOnly={readOnly}
          value={form.email}
        >
          <AppInputText
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="w-full"
          />
        </FormField>

        <FormField label={t('common.phone')} readOnly={readOnly} value={form.phone ?? ''}>
          <AppInputText
            value={form.phone ?? ''}
            onChange={(e) => set('phone', e.target.value)}
            className="w-full"
          />
        </FormField>

        {/* Só em redator já existente: no cadastro o acesso nasce ativo pelo
            `UserProvisioner`, e um controle que o POST ignora mentiria. Molde
            de `StaffUserDialog` — não existe `AppSwitch` em `shared/ui` e
            feature não importa PrimeReact direto (lei §5.6). */}
        {form.id !== undefined && (
          <FormField
            label={t('redator.accessState')}
            readOnly={readOnly}
            value={(form.is_active ?? true) ? t('common.active') : t('common.inactive')}
          >
            <AppDropdown
              value={form.is_active ?? true}
              options={[
                { label: t('common.active'), value: true },
                { label: t('common.inactive'), value: false },
              ]}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => set('is_active', e.value)}
            />
          </FormField>
        )}
      </div>
    </>
  )
}
