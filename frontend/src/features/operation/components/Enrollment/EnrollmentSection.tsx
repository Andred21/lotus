import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import { EnrollmentTable } from './EnrollmentTable'
import { EnrollStudentForm } from './EnrollStudentForm'

// Botão de importar planilha entra na Task 6.
export function EnrollmentSection({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useEnrollmentSection(turma)
  const [addOpen, setAddOpen] = useState(false)

  if (s.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end gap-2">
        <AppButton
          label={t('operation.enrollment.addStudent')}
          icon="pi pi-user-plus"
          outlined
          onClick={() => setAddOpen(true)}
        />
      </div>

      {s.error && <p className="text-sm text-red-600">{s.error}</p>}
      <EnrollmentTable enrollments={s.enrollments} onRemove={s.remove} removing={s.removing} />
      <p className="text-sm text-slate-500">
        {t('operation.enrollment.footerCount', { count: s.enrollments.length })}
      </p>

      <EnrollStudentForm
        turmaId={turma.id!}
        turmaClientName={turma.client_name ?? null}
        visible={addOpen}
        onHide={() => setAddOpen(false)}
      />
    </div>
  )
}
