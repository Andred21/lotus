import { useTranslation } from 'react-i18next'
import { AppInputText, AppDropdown, FormField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

const TYPE_VALUES = ['client', 'provider', 'other'] as const

/** Dados gerais da empresa: razón social, RUT, email, tipo e giro. Subcomponente
 * local de `commercial` (não `shared/ui`): tem vocabulário de domínio. A foto
 * fica no diálogo — quem a alimenta é o `useEntityPhoto` de lá, e trazê-la para
 * cá custaria repassar 8 props por um componente que é sobre campos de texto. */
export function ClientGeneralFields({
  form, readOnly, fieldErrors, onChange,
}: {
  form: ClientData
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onChange: <K extends keyof ClientData>(k: K, v: ClientData[K]) => void
}) {
  const { t } = useTranslation()
  const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))

  return (
    <>
      {/* Empresa não tem "nome" separado da razón social — `name` (exigido
          pelo backend) é derivado de `legal_name` no submit. Erro de `name`
          aparece aqui pois foi este campo que o gerou. */}
      <FormField
        label={t('client.legalName')}
        error={fieldErrors?.legal_name?.[0] ?? fieldErrors?.name?.[0]}
        readOnly={readOnly}
        value={form.legal_name}
      >
        <AppInputText
          value={form.legal_name}
          onChange={(e) => onChange('legal_name', e.target.value)}
          className="w-full"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]} readOnly={readOnly} value={form.rut}>
          <AppInputText
            value={form.rut}
            onChange={(e) => onChange('rut', e.target.value)}
            className="w-full"
          />
        </FormField>
        <FormField label={t('common.email')} error={fieldErrors?.email?.[0]} readOnly={readOnly} value={form.email}>
          <AppInputText
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('client.type')} readOnly={readOnly} value={t(`clientType.${form.type}`)}>
          <AppDropdown
            value={form.type}
            options={types}
            onChange={(e) => onChange('type', e.value)}
          />
        </FormField>
        <FormField
          label={t('client.businessActivity')}
          readOnly={readOnly}
          value={form.business_activity ?? ''}
        >
          <AppInputText
            value={form.business_activity ?? ''}
            onChange={(e) => onChange('business_activity', e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>
    </>
  )
}
