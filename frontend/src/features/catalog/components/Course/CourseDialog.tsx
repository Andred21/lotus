import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppTextarea, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { redatoresApi } from '@shared/api/redatoresApi'
import { useCourseForm, type CourseDialogMode } from '../../hooks/useCourseForm'

export function CourseDialog({
  visible, mode, course, onHide, onEdit,
}: {
  visible: boolean
  mode: CourseDialogMode
  course: CourseData | null
  onHide: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const { form, set, toggleRedator, readOnly, submit, pending, fieldErrors, generalError } =
    useCourseForm(course, mode, onHide)
  const redatores = redatoresApi.useList()

  const isCreate = mode === 'create'
  const enabledIds = form.redator_ids
  // Leitura (view/edit): só os redatores já habilitados, derivados da lista viva.
  const enabledRedatores = (redatores.data ?? []).filter((r) => enabledIds.includes(r.id as number))

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={isCreate ? t('course.new') : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={isCreate ? t('course.create') : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} mapped={['name', 'technical_name', 'description', 'workload_hours']} />

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">{t('course.sectionGeneral')}</h3>

        <FormField label={t('course.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} placeholder={t('course.namePlaceholder')} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('course.technicalName')} error={fieldErrors?.technical_name?.[0]}>
            <AppInputText value={form.technical_name ?? ''} disabled={readOnly} placeholder={t('course.technicalNamePlaceholder')} onChange={(e) => set('technical_name', e.target.value)} className="w-full" />
          </FormField>
          <FormField label={t('course.workloadHours')} error={fieldErrors?.workload_hours?.[0]}>
            <AppInputText
              value={String(form.workload_hours)}
              disabled={readOnly}
              onChange={(e) => set('workload_hours', Number(e.target.value.replace(/\D/g, '')) || 0)}
              className="w-full"
            />
          </FormField>
        </div>

        <FormField label={t('course.description')} error={fieldErrors?.description?.[0]}>
          <AppTextarea value={form.description ?? ''} disabled={readOnly} rows={3} onChange={(e) => set('description', e.target.value)} className="w-full" />
        </FormField>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('course.sectionRedatores')}</h3>

        {isCreate ? (
          // Exceção do produto: habilitar redatores só no cadastro do curso.
          <div className="space-y-1">
            {(redatores.data ?? []).map((r) => (
              <label key={r.id} className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={enabledIds.includes(r.id as number)}
                  onChange={() => toggleRedator(r.id as number)}
                />
                <span className="text-sm">{r.name}</span>
              </label>
            ))}
          </div>
        ) : (
          // View/edit: leitura. A edição da habilitação mora em Pessoas.
          <div className="space-y-1">
            <p className="text-xs text-slate-500">{t('course.redatoresReadonlyNote')}</p>
            {enabledRedatores.length === 0 ? (
              <p className="text-sm text-slate-500">{t('course.noRedatores')}</p>
            ) : (
              enabledRedatores.map((r) => (
                <div key={r.id} className="rounded p-2 text-sm">{r.name}</div>
              ))
            )}
          </div>
        )}
      </section>
    </CrudDialog>
  )
}
