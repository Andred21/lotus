import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppTextarea, AppErrorState, AppSkeleton, FormField, FormSection, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { usePermissions } from '@shared/hooks'
import { useCourseForm, type CourseDialogMode } from '../../hooks/useCourseForm'
import { useCourseRedatores } from '../../hooks/useCourseRedatores'
import { RedatorCard } from './RedatorCard'
import { ModuleFields } from './ModuleFields'

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
  const redatores = useCourseRedatores(form.redator_ids)
  const navigate = useNavigate()
  const { can } = usePermissions()
  // O olho leva ao módulo dono do redator. `catalog` não pode importar o
  // RedatorDialog de `identity` (lei §5.6) — composição cruzada mora na rota.
  // Sem `identity.user.view` a página de destino não serviria de nada.
  const canOpenRedator = can('identity.user.view')
  const openRedator = (id: number) => {
    onHide()
    navigate(`/personas?redator=${id}`)
  }

  const isCreate = mode === 'create'
  const enabledIds = form.redator_ids

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

        <FormField label={t('course.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} placeholder={t('course.namePlaceholder')} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
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

        {/* Três estados distintos, de propósito (spec D11): antes, um GET com 403
            caía em `?? []` e a tela dizia "sem redatores habilitados" num curso
            que tem três — afirmação falsa sobre o banco. */}
        {redatores.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
            <AppSkeleton height="4.5rem" />
            <AppSkeleton height="4.5rem" />
          </div>
        ) : redatores.isError ? (
          <AppErrorState
            title={t('common.loadError')}
            detail={redatores.errorDetail ?? t('common.loadErrorHint')}
            retryLabel={t('common.retry')}
            onRetry={redatores.refetch}
          />
        ) : isCreate ? (
          // Exceção do produto: habilitar redatores pelo lado do curso só no cadastro.
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('course.redatoresSelectNote')}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {redatores.allRedatores.map((r) => (
                <RedatorCard
                  key={r.id}
                  redator={r}
                  selected={enabledIds.includes(r.id as number)}
                  onToggle={() => toggleRedator(r.id as number)}
                />
              ))}
            </div>
          </div>
        ) : (
          // View/edit: leitura. A edição da habilitação mora em Pessoas.
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('course.redatoresReadonlyNote')}
            </p>
            {redatores.enabledRedatores.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t('course.noRedatores')}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {redatores.enabledRedatores.map((r) => (
                  <RedatorCard
                    key={r.id}
                    redator={r}
                    onView={canOpenRedator ? () => openRedator(r.id as number) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </CrudDialog>
  )
}
