import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppTextarea, AppErrorState, AppSkeleton, FormField, FormSection, NestedField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { usePermissions } from '@shared/hooks'
import { useCourseForm, type CourseDialogMode } from '../../hooks/useCourseForm'
import { useCourseRedatores } from '../../hooks/useCourseRedatores'
import { RedatorCard } from './RedatorCard'

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

        {form.modules.length === 0 && (
          <p className="text-sm text-slate-500">{t('courseModule.empty')}</p>
        )}

        {/* key={i}: o backend faz replace dos módulos, então os ids trocam a cada save —
            um id como key remontaria as linhas e perderia o foco. A ordem só muda por
            ação explícita do usuário (moveModule). */}
        {form.modules.map((m, i) => (
          <div key={i} className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-start gap-2">
              <span className="mt-2.5 text-xs font-semibold text-slate-500">{t('courseModule.itemLabel', { n: i + 1 })}</span>
              <NestedField error={fieldErrors?.[`modules.${i}.name`]?.[0]}>
                <div className="flex-1">
                  <AppInputText
                    placeholder={t('courseModule.namePlaceholder')}
                    aria-label={t('courseModule.name')}
                    value={m.name}
                    disabled={readOnly}
                    onChange={(e) => patchModule(i, { name: e.target.value })}
                    className="w-full"
                  />
                </div>
              </NestedField>
              {!readOnly && (
                <div className="flex gap-1">
                  <AppButton icon="pi pi-arrow-up" text aria-label={t('courseModule.moveUp')} tooltip={t('courseModule.moveUp')} disabled={i === 0} onClick={() => moveModule(i, -1)} />
                  <AppButton icon="pi pi-arrow-down" text aria-label={t('courseModule.moveDown')} tooltip={t('courseModule.moveDown')} disabled={i === form.modules.length - 1} onClick={() => moveModule(i, 1)} />
                  <AppButton icon="pi pi-trash" text aria-label={t('courseModule.remove')} tooltip={t('courseModule.remove')} onClick={() => removeModule(i)} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <NestedField error={fieldErrors?.[`modules.${i}.theory_hours`]?.[0]}>
                <span className="mb-1 block text-xs text-slate-500">{t('courseModule.theoryHours')}</span>
                <AppInputText
                  aria-label={t('courseModule.theoryHours')}
                  value={String(m.theory_hours)}
                  disabled={readOnly}
                  onChange={(e) => patchModule(i, { theory_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                  className="w-full"
                />
              </NestedField>
              <NestedField error={fieldErrors?.[`modules.${i}.practice_hours`]?.[0]}>
                <span className="mb-1 block text-xs text-slate-500">{t('courseModule.practiceHours')}</span>
                <AppInputText
                  aria-label={t('courseModule.practiceHours')}
                  value={String(m.practice_hours)}
                  disabled={readOnly}
                  onChange={(e) => patchModule(i, { practice_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                  className="w-full"
                />
              </NestedField>
              <span className="pb-2 text-sm text-slate-500">
                {t('courseModule.total', { hours: m.theory_hours + m.practice_hours })}
              </span>
            </div>

            <NestedField error={fieldErrors?.[`modules.${i}.learnings`]?.[0]}>
              <span className="mb-1 block text-xs text-slate-500">{t('courseModule.learnings')}</span>
              <AppTextarea
                aria-label={t('courseModule.learnings')}
                value={m.learnings ?? ''}
                disabled={readOnly}
                rows={2}
                onChange={(e) => patchModule(i, { learnings: e.target.value })}
                className="w-full"
              />
            </NestedField>

            <NestedField error={fieldErrors?.[`modules.${i}.contents`]?.[0]}>
              <span className="mb-1 block text-xs text-slate-500">{t('courseModule.contents')}</span>
              <AppTextarea
                aria-label={t('courseModule.contents')}
                value={m.contents ?? ''}
                disabled={readOnly}
                rows={3}
                onChange={(e) => patchModule(i, { contents: e.target.value })}
                className="w-full"
              />
            </NestedField>
          </div>
        ))}

        {!readOnly && (
          <AppButton label={t('courseModule.add')} icon="pi pi-plus" text onClick={addModule} />
        )}

        {form.modules.length > 0 && (
          <p className="text-right text-sm text-slate-500">
            {t('courseModule.modulesTotal', { hours: modulesTotal })}
          </p>
        )}

        {/* Aviso, não erro: âmbar e sem role="alert" (o FormErrorBanner é vermelho e
            para 422). NUNCA bloqueia o submit — §5.7, registro não bloqueia ação. */}
        {hoursMismatch && (
          <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {t('courseModule.hoursMismatch', { modules: modulesTotal, workload: form.workload_hours })}
          </p>
        )}

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
