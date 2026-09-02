import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, FormErrorSummary, FormErrorBanner, useFormField } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { useQuoteForm } from '../../hooks/useQuoteForm'
import { useQuoteCourseSearch } from '../../hooks/useQuoteCourseSearch'
import { CourseStep } from './CourseStep'
import { DataStep } from './DataStep'

export function QuoteWizard({
  visible, budgetId, quote, onHide,
}: {
  visible: boolean
  budgetId: number
  quote: QuoteData | null
  onHide: () => void
}) {
  const { t } = useTranslation()
  const f = useQuoteForm(budgetId, quote, onHide)
  const { form, set, step, next, back, canAdvance, submit, pending, fieldErrors, generalError } = f
  const campo = useFormField(f)
  const courses = useQuoteCourseSearch()

  const footer =
    step === 1 ? (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton variant="primary" label={t('quote.next')} icon="pi pi-arrow-right" disabled={!canAdvance} onClick={next} />
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <AppButton label={t('quote.back')} text icon="pi pi-arrow-left" onClick={back} />
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton
          variant="primary"
          label={quote ? t('common.save') : t('quote.create')}
          icon="pi pi-check"
          loading={pending}
          onClick={submit}
        />
      </div>
    )

  return (
    <AppDialog
      header={
        <div className="flex items-center justify-between gap-4">
          <span>{quote ? t('quote.edit') : t('quote.new')}</span>
          <span className="text-xs font-normal text-slate-500">{t('quote.step', { current: step, total: 2 })}</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      footer={footer}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary
        errors={fieldErrors}
        mapped={['course_id', 'student_count', 'value_uf', 'purchase_order', 'planned_start_date', 'planned_end_date']}
      />

      {/* Fora do passo: o campo do curso só existe no passo 1, mas o 422 de
          course_id (curso removido entre a escolha e o submit) chega com o
          wizard no passo 2 — dentro do passo 1 ele ficaria invisível. */}
      {/* A catraca do item 24 mede a extração à mão porque o campo ligado ao
          form já traz o erro pelo `name` — mas aqui não há campo: o `course_id`
          vive no passo 1 e esta mensagem precisa aparecer no passo 2, fora de
          qualquer `Field`. Suprimido nas duas linhas, e não no arquivo, para a
          régua seguir valendo nos campos de verdade. */}
      {/* eslint-disable-next-line no-restricted-syntax */}
      {fieldErrors?.course_id?.[0] && (
        // eslint-disable-next-line no-restricted-syntax
        <p className="mb-4 text-sm text-red-600">{fieldErrors.course_id[0]}</p>
      )}

      {step === 1 ? (
        <CourseStep
          courses={courses}
          selectedId={form.course_id}
          onSelect={(id) => set('course_id', id)}
        />
      ) : (
        <DataStep Field={campo.Field} form={form} onChange={set} />
      )}
    </AppDialog>
  )
}
