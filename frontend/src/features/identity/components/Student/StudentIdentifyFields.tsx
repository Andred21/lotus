import { useTranslation } from 'react-i18next'
import { AppInputText, FormField } from '@shared/ui'
import type { StudentFormFields } from '../../hooks/useStudentForm'

/** Os quatro campos de identificação do aluno, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam. */
export function StudentIdentityFields({
  form,
  set,
  readOnly,
  fieldErrors,
}: {
  form: StudentFormFields
  set: <K extends keyof StudentFormFields>(key: K, value: StudentFormFields[K]) => void
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
}) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-1">
      <FormField
          label={t("student.name")}
          error={fieldErrors?.name?.[0]}
          readOnly={readOnly}
          value={form.name}
        >
          <AppInputText
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
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
      </div>
    </>
  )
}
