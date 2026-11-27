import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppTextarea, useFormField, FormSection, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import { TETOS_IMPRESSOS } from '@shared/config/tetosImpressos'
import { courseLabel } from '@shared/lib'
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
      size="lg"
      visible={visible}
      mode={mode}
      title={isCreate ? t('course.new') : courseLabel({ code: course?.code, name: form.name })}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      guard={f.guard}
      submitLabel={isCreate ? t('course.create') : undefined}
    >
      
      <FormErrorBanner message={generalError} />
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />

      <section className="space-y-4">
        <FormSection title={t('course.sectionGeneral')} />

        <campo.Field name="name" label={t('course.name')}>
          <AppInputText
            placeholder={t('course.namePlaceholder')}
            className="w-full"
            maxLength={TETOS_IMPRESSOS.nomeCurso}
          />
        </campo.Field>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* sence_code é opcional e só dígitos (o backend valida `^\d{1,20}$`); o
              C-<n> não é campo: vem pronto do backend e aparece no título. */}
          <campo.Field name="sence_code" label={t('course.senceCode')}>
            <AppInputText
              inputMode="numeric"
              placeholder={t('course.senceCodePlaceholder')}
              className="w-full"
              maxLength={20}
              onChange={(e) => f.set('sence_code', e.target.value.replace(/\D/g, '') || null)}
            />
          </campo.Field>
          {/* technical_name chega null do backend: quem cuida é o `?? ''` do
              wrapper (Task 3), não a tela. */}
          <campo.Field name="technical_name" label={t('course.technicalName')}>
            <AppInputText
              placeholder={t('course.technicalNamePlaceholder')}
              className="w-full"
              maxLength={TETOS_IMPRESSOS.nomeTecnico}
            />
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
          <AppTextarea rows={3} className="w-full" maxLength={TETOS_IMPRESSOS.descricaoCurso} showCount />
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
