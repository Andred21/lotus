import { useTranslation } from 'react-i18next'
import { AppInputText, AppDatePicker, FormSection, type FieldComponent } from '@shared/ui'
import type { QuoteFormFields } from '../../hooks/useQuoteForm'
import { parseUfInput } from '@shared/lib'

/** Passo 2 do wizard: alunos, valor UF, ordem de compra e datas previstas.
 *
 * `form` e `onChange` continuam entrando ALÉM do `Field`: três dos cinco
 * campos convertem valor nos dois sentidos (contagem em string de dígitos,
 * UF com vírgula, ordem de compra que troca `''` por `null`) e o `Field`
 * sozinho não resolve conversão — só passa o valor cru do form (item 24,
 * spec §5). O que sai é `fieldErrors`: as 5 extrações `?.[0]` viram `Field`. */
export function DataStep({
  Field, form, onChange,
}: {
  Field: FieldComponent<QuoteFormFields>
  form: QuoteFormFields
  onChange: <K extends keyof QuoteFormFields>(k: K, v: QuoteFormFields[K]) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <FormSection title={t('quote.stepData')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="student_count" label={t('quote.students')}>
          <AppInputText
            value={String(form.student_count)}
            onChange={(e) => onChange('student_count', Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="w-full"
          />
        </Field>

        {/* value_uf NUNCA vira Number: aceita vírgula OU ponto na digitação
            e normaliza para ponto — troca de caractere, não aritmética.
            O estado é canônico (ponto), mas a EXIBIÇÃO é sempre es-CL
            (vírgula): "1.250" é ambíguo (mil duzentos e cinquenta, ou
            1,25?) e nenhuma heurística resolve isso sem errar outro caso.
            Mostrando de volta "1,250", o usuário VÊ que o valor virou
            decimal — o caso ambíguo falha à vista, não em silêncio. */}
        <Field name="value_uf" label={t('quote.valueUf')}>
          <AppInputText
            value={form.value_uf.replace('.', ',')}
            onChange={(e) => onChange('value_uf', parseUfInput(e.target.value))}
            className="w-full"
          />
        </Field>
      </div>

      <Field name="purchase_order" label={t('quote.purchaseOrder')}>
        <AppInputText
          onChange={(e) => onChange('purchase_order', e.target.value || null)}
          className="w-full"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="planned_start_date" label={t('quote.plannedStart')}>
          <AppDatePicker />
        </Field>
        <Field name="planned_end_date" label={t('quote.plannedEnd')}>
          <AppDatePicker />
        </Field>
      </div>
    </section>
  )
}
