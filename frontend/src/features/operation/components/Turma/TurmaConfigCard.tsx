import { useTranslation } from 'react-i18next'
import { AppButton, AppDropdown, AppInputText, AppDatePicker, FormField, FormErrorSummary } from '@shared/ui'
import type { DialogMode } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { useTurmaConfigForm } from '../../hooks/useTurmaConfigForm'

type Props = {
  mode: DialogMode
  turma?: TurmaData | null
  quoteId?: number
  onSaved: (turmaId: number) => void
  onEdit?: () => void
  onCancel?: () => void
}

const MAPPED = ['modalidade', 'local_aplicacao', 'start_date', 'end_date']

export function TurmaConfigCard({ mode, turma = null, quoteId, onSaved, onEdit, onCancel }: Props) {
  const { t } = useTranslation()
  const f = useTurmaConfigForm({ mode, turma, quoteId, onSaved })
  const courses = coursesApi.useList()
  const course = turma?.course_id != null ? courses.data?.find((c) => c.id === turma.course_id) : undefined

  const modalityOptions = [
    { label: t('operation.modality.presencial'), value: 'presencial' },
    { label: t('operation.modality.online'), value: 'online' },
  ]

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t('operation.config.title')}</h3>
        {mode === 'view' && onEdit && (
          <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={onEdit} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('operation.config.modality')} error={f.fieldErrors?.modalidade?.[0]}>
          <AppDropdown
            value={f.form.modalidade}
            options={modalityOptions}
            disabled={f.readOnly}
            onChange={(e) => f.set('modalidade', e.value)}
          />
        </FormField>

        <FormField label={t('operation.config.local')} error={f.fieldErrors?.local_aplicacao?.[0]}>
          <AppInputText
            value={f.form.local_aplicacao ?? ''}
            placeholder={t('operation.config.localPlaceholder')}
            disabled={f.readOnly || f.form.modalidade === 'online'}
            onChange={(e) => f.set('local_aplicacao', e.target.value)}
          />
        </FormField>

        <FormField label={t('operation.config.startDate')} error={f.fieldErrors?.start_date?.[0]}>
          <AppDatePicker value={f.form.start_date || null} disabled={f.readOnly} onChange={(v) => f.set('start_date', v ?? '')} />
        </FormField>

        <FormField label={t('operation.config.endDate')} error={f.fieldErrors?.end_date?.[0]}>
          <AppDatePicker value={f.form.end_date || null} disabled={f.readOnly} onChange={(v) => f.set('end_date', v ?? '')} />
        </FormField>

        {mode !== 'create' && (
          <FormField label={t('operation.config.workload')}>
            <AppInputText value={course ? t('operation.config.workloadValue', { hours: course.workload_hours }) : '—'} disabled readOnly />
          </FormField>
        )}
      </div>

      <FormErrorSummary errors={f.fieldErrors} mapped={MAPPED} />
      {f.generalError && <p className="text-sm text-red-600">{f.generalError}</p>}

      {mode !== 'view' && (
        <div className="flex justify-end gap-2">
          {onCancel && <AppButton label={t('operation.config.cancel')} outlined onClick={onCancel} disabled={f.pending} />}
          <AppButton variant="brandIcon" label={t('operation.config.save')} icon="pi pi-check" onClick={f.submit} disabled={f.pending} />
        </div>
      )}
    </div>
  )
}
