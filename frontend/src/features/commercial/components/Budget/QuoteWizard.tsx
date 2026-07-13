import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { useQuoteForm } from '../../hooks/useQuoteForm'

export function QuoteWizard({
  visible, budgetId, quote, onHide,
}: {
  visible: boolean
  budgetId: number
  quote: QuoteData | null
  onHide: () => void
}) {
  const { t } = useTranslation()
  const { form, set, step, next, back, canAdvance, submit, pending, fieldErrors, generalError } =
    useQuoteForm(budgetId, quote, onHide)
  const courses = coursesApi.useList()
  const [search, setSearch] = useState('')

  const list = (courses.data ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const footer =
    step === 1 ? (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton variant="brandIcon" label={t('quote.next')} icon="pi pi-arrow-right" disabled={!canAdvance} onClick={next} />
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <AppButton label={t('quote.back')} text icon="pi pi-arrow-left" onClick={back} />
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton
          variant="brandIcon"
          label={quote ? t('common.save') : t('quote.create')}
          icon="pi pi-check"
          loading={pending}
          onClick={submit}
        />
      </div>
    )

  return (
    <AppDialog
      header={quote ? t('quote.edit') : t('quote.new')}
      visible={visible}
      onHide={onHide}
      footer={footer}
    >
      {generalError && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generalError}
        </p>
      )}
      {fieldErrors && (
        <UnmappedErrors
          errors={fieldErrors}
          mapped={['course_id', 'student_count', 'value_uf', 'purchase_order', 'planned_start_date', 'planned_end_date']}
        />
      )}

      {/* Fora do passo: o campo do curso só existe no passo 1, mas o 422 de
          course_id (curso removido entre a escolha e o submit) chega com o
          wizard no passo 2 — dentro do passo 1 ele ficaria invisível. */}
      {fieldErrors?.course_id?.[0] && (
        <p className="mb-4 text-sm text-red-600">{fieldErrors.course_id[0]}</p>
      )}

      {step === 1 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-slate-500">{t('quote.stepCourse')}</h3>
          <AppInputText
            leftIcon="pi pi-search"
            placeholder={t('quote.courseSearchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {list.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <input
                  type="radio"
                  name="quote-course"
                  checked={form.course_id === c.id}
                  onChange={() => set('course_id', c.id as number)}
                />
                <span className="text-sm">
                  {c.name}
                  <span className="ml-2 text-slate-500">{c.workload_hours}h</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase text-slate-500">{t('quote.stepData')}</h3>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('quote.students')} error={fieldErrors?.student_count?.[0]}>
              <AppInputText
                value={String(form.student_count)}
                onChange={(e) => set('student_count', Number(e.target.value.replace(/\D/g, '')) || 0)}
                className="w-full"
              />
            </Field>

            {/* value_uf NUNCA vira Number: só sanitiza os caracteres e envia string. */}
            <Field label={t('quote.valueUf')} error={fieldErrors?.value_uf?.[0]}>
              <AppInputText
                value={form.value_uf}
                onChange={(e) => set('value_uf', e.target.value.replace(/[^\d.]/g, ''))}
                className="w-full"
              />
            </Field>
          </div>

          <Field label={t('quote.purchaseOrder')} error={fieldErrors?.purchase_order?.[0]}>
            <AppInputText
              value={form.purchase_order ?? ''}
              onChange={(e) => set('purchase_order', e.target.value || null)}
              className="w-full"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('quote.plannedStart')} error={fieldErrors?.planned_start_date?.[0]}>
              <input
                type="date"
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                value={form.planned_start_date ?? ''}
                onChange={(e) => set('planned_start_date', e.target.value || null)}
              />
            </Field>
            <Field label={t('quote.plannedEnd')} error={fieldErrors?.planned_end_date?.[0]}>
              <input
                type="date"
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                value={form.planned_end_date ?? ''}
                onChange={(e) => set('planned_end_date', e.target.value || null)}
              />
            </Field>
          </div>
        </section>
      )}
    </AppDialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

function UnmappedErrors({ errors, mapped }: { errors: Record<string, string[]>; mapped: string[] }) {
  const leftover = Object.entries(errors).filter(([key]) => !mapped.includes(key))
  if (leftover.length === 0) return null
  return (
    <ul className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
      {leftover.map(([key, msgs]) => (
        <li key={key}>{msgs[0]}</li>
      ))}
    </ul>
  )
}
