import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppTextarea, FormField, FormSection, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { useCourseForm, type CourseDialogMode } from '../../hooks/useCourseForm'
import { useCourseRedatores } from '../../hooks/useCourseRedatores'
import { ModuleFields } from './ModuleFields'
import { CourseRedatoresSection } from './CourseRedatoresSection'

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
  const { form, set, toggleRedator, readOnly, submit, pending, fieldErrors, generalError,
          addModule, removeModule, patchModule, moveModule,
          modulesTotal, hoursMismatch } = useCourseForm(course, mode, onHide)
  const redatores = useCourseRedatores(form.redator_ids, onHide)

  const isCreate = mode === 'create'

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
      <FormErrorSummary
        errors={fieldErrors}
        mapped={['name', 'technical_name', 'description', 'workload_hours']}
        excludePrefixes={['modules.']}
      />

      <section className="space-y-4">
        <FormSection title={t('course.sectionGeneral')} />

        <FormField label={t('course.name')} error={fieldErrors?.name?.[0]} readOnly={readOnly} value={form.name}>
          <AppInputText value={form.name} placeholder={t('course.namePlaceholder')} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t('course.technicalName')}
            error={fieldErrors?.technical_name?.[0]}
            readOnly={readOnly}
            value={form.technical_name ?? ''}
          >
            <AppInputText value={form.technical_name ?? ''} placeholder={t('course.technicalNamePlaceholder')} onChange={(e) => set('technical_name', e.target.value)} className="w-full" />
          </FormField>
          <FormField
            label={t('course.workloadHours')}
            error={fieldErrors?.workload_hours?.[0]}
            readOnly={readOnly}
            value={String(form.workload_hours)}
          >
            <AppInputText
              value={String(form.workload_hours)}
              onChange={(e) => set('workload_hours', Number(e.target.value.replace(/\D/g, '')) || 0)}
              className="w-full"
            />
          </FormField>
        </div>

        <FormField
          label={t('course.description')}
          error={fieldErrors?.description?.[0]}
          readOnly={readOnly}
          value={form.description ?? ''}
        >
          <AppTextarea value={form.description ?? ''} rows={3} onChange={(e) => set('description', e.target.value)} className="w-full" />
        </FormField>

        <FormSection title={t('courseModule.section')} spaced />

        <ModuleFields
          modules={form.modules}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          workloadHours={form.workload_hours}
          modulesTotal={modulesTotal}
          hoursMismatch={hoursMismatch}
          onAdd={addModule}
          onRemove={removeModule}
          onPatch={patchModule}
          onMove={moveModule}
        />

        <FormSection title={t('course.sectionRedatores')} spaced />

        <CourseRedatoresSection
          redatores={redatores}
          isCreate={isCreate}
          enabledIds={form.redator_ids}
          onToggle={toggleRedator}
        />
      </section>
    </CrudDialog>
  )
}
