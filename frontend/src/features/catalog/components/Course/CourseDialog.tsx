import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppTextarea, useFormField, FormSection, FormErrorSummary, FormErrorBanner } from '@shared/ui'
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
  const f = useCourseForm(course, mode, onHide)
  const { form, toggleRedator, readOnly, submit, pending, fieldErrors, generalError,
          errorSummary, addModule, removeModule, patchModule, moveModule,
          modulesTotal, hoursMismatch } = f
  const redatores = useCourseRedatores(form.redator_ids, onHide)
  const campo = useFormField(f)

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
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />

      <section className="space-y-4">
        <FormSection title={t('course.sectionGeneral')} />

        <campo.Field name="name" label={t('course.name')}>
          <AppInputText placeholder={t('course.namePlaceholder')} className="w-full" />
        </campo.Field>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* technical_name chega null do backend: quem cuida é o `?? ''` do
              wrapper (Task 3), não a tela. */}
          <campo.Field name="technical_name" label={t('course.technicalName')}>
            <AppInputText placeholder={t('course.technicalNamePlaceholder')} className="w-full" />
          </campo.Field>
          {/* workload_hours converte nos dois sentidos (string de dígitos <->
              number): o Field sozinho só passaria o valor cru do form, então
              value/onChange ficam manuais no AppInputText — e o `value` de
              apresentação do Field também fica, porque em leitura o número
              cru renderizaria sem o String (task-8 brief). */}
          <campo.Field
            name="workload_hours"
            label={t('course.workloadHours')}
            value={String(form.workload_hours)}
          >
            <AppInputText
              value={String(form.workload_hours)}
              onChange={(e) => f.set('workload_hours', Number(e.target.value.replace(/\D/g, '')) || 0)}
              className="w-full"
            />
          </campo.Field>
        </div>

        {/* description chega null do backend: mesma razão do technical_name. */}
        <campo.Field name="description" label={t('course.description')}>
          <AppTextarea rows={3} className="w-full" />
        </campo.Field>

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
