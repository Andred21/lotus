import { useTranslation } from 'react-i18next'
import { AppInputText, AppDatePicker, FormField, FormSection } from '@shared/ui'
import type { QuoteFormFields } from '../../hooks/useQuoteForm'
import { parseUfInput } from '../../lib/uf'

/** Passo 2 do wizard: alunos, valor UF, ordem de compra e datas previstas. */
export function DataStep({
  form, fieldErrors, onChange,
}: {
  form: QuoteFormFields
  fieldErrors?: Record<string, string[]> | null
  onChange: <K extends keyof QuoteFormFields>(k: K, v: QuoteFormFields[K]) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <FormSection title={t('quote.stepData')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('quote.students')} error={fieldErrors?.student_count?.[0]}>
          <AppInputText
            value={String(form.student_count)}
            onChange={(e) => onChange('student_count', Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="w-full"
          />
        </FormField>

        {/* value_uf NUNCA vira Number: aceita vírgula OU ponto na digitação
            e normaliza para ponto — troca de caractere, não aritmética.
            O estado é canônico (ponto), mas a EXIBIÇÃO é sempre es-CL
            (vírgula): "1.250" é ambíguo (mil duzentos e cinquenta, ou
            1,25?) e nenhuma heurística resolve isso sem errar outro caso.
            Mostrando de volta "1,250", o usuário VÊ que o valor virou
            decimal — o caso ambíguo falha à vista, não em silêncio. */}
        <FormField label={t('quote.valueUf')} error={fieldErrors?.value_uf?.[0]}>
          <AppInputText
            value={form.value_uf.replace('.', ',')}
            onChange={(e) => onChange('value_uf', parseUfInput(e.target.value))}
            className="w-full"
          />
        </FormField>
      </div>

      <FormField label={t('quote.purchaseOrder')} error={fieldErrors?.purchase_order?.[0]}>
        <AppInputText
          value={form.purchase_order ?? ''}
          onChange={(e) => onChange('purchase_order', e.target.value || null)}
          className="w-full"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('quote.plannedStart')} error={fieldErrors?.planned_start_date?.[0]}>
          <AppDatePicker
            value={form.planned_start_date ?? null}
            onChange={(v) => onChange('planned_start_date', v)}
          />
        </FormField>
        <FormField label={t('quote.plannedEnd')} error={fieldErrors?.planned_end_date?.[0]}>
          <AppDatePicker
            value={form.planned_end_date ?? null}
            onChange={(v) => onChange('planned_end_date', v)}
          />
        </FormField>
      </div>
    </section>
  )
}
