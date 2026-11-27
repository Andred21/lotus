import { useTranslation } from 'react-i18next'
import { AppInputText, AppDatePicker, FormSection, type FieldComponent } from '@shared/ui'
import type { QuoteFormFields } from '../../hooks/useQuoteForm'

/** Passo 2 do wizard: alunos, valor UF, ordem de compra e datas previstas.
 *
 * `form` e `onChange` continuam entrando ALÉM do `Field`: três dos cinco
 * campos convertem valor nos dois sentidos (contagem em string de dígitos,
 * UF com vírgula, ordem de compra que troca `''` por `null`) e o `Field`
 * sozinho não resolve conversão — só passa o valor cru do form (item 24,
 * spec §5). O que sai é `fieldErrors`: as 5 extrações `?.[0]` viram `Field`.
 *
 * `onlyUf` (cotação aprovada com turma, spec D2/D8): só o `value_uf` segue
 * editável. Os outros quatro entram em modo leitura pelo próprio `Field`, que
 * mostra o valor gravado como texto — o idioma do repositório para campo
 * travado, e não `disabled`, que trunca o valor (spec BD-3 §4). */
export function DataStep({
  Field, form, onChange, onValueUf, onlyUf = false,
}: {
  Field: FieldComponent<QuoteFormFields>
  form: QuoteFormFields
  onChange: <K extends keyof QuoteFormFields>(k: K, v: QuoteFormFields[K]) => void
  /** Texto cru do campo de UF: quem interpreta (e recusa o ambíguo) é o hook. */
  onValueUf: (raw: string) => void
  onlyUf?: boolean
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <FormSection title={t('quote.stepData')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="student_count" label={t('quote.students')} required readOnly={onlyUf}>
          <AppInputText
            value={String(form.student_count)}
            onChange={(e) => onChange('student_count', Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="w-full"
          />
        </Field>

        {/* value_uf NUNCA vira Number: aceita vírgula OU ponto na digitação
            e normaliza para ponto — troca de caractere, não aritmética.
            O estado é canônico (ponto), e o eco é sempre vírgula decimal.
            O eco sozinho não bastava: em inglês a lista mostra 1500 como
            "1,500", igual ao eco de 1,5. Por isso a forma ambígua ("1,500",
            "1.500", "1.500.000") é recusada pelo hook com erro no campo, em
            qualquer idioma (Q-2 da revisão do bloco 66). */}
        <Field name="value_uf" label={t('quote.valueUf')} required>
          <AppInputText
            value={form.value_uf.replace('.', ',')}
            onChange={(e) => onValueUf(e.target.value)}
            className="w-full"
          />
        </Field>
      </div>

      <Field name="purchase_order" label={t('quote.purchaseOrder')} readOnly={onlyUf}>
        <AppInputText
          onChange={(e) => onChange('purchase_order', e.target.value || null)}
          className="w-full"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="planned_start_date" label={t('quote.plannedStart')} readOnly={onlyUf}>
          <AppDatePicker />
        </Field>
        <Field name="planned_end_date" label={t('quote.plannedEnd')} readOnly={onlyUf}>
          <AppDatePicker />
        </Field>
      </div>
    </section>
  )
}
