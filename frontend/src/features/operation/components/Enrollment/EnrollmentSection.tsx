import { useTranslation } from 'react-i18next'
import type { TurmaData } from '@shared/types/generated'
import { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import { EnrollmentTable } from './EnrollmentTable'

// Nesta task só tabela + remoção; botões de adicionar/importar entram nas
// Tasks 5/6.
export function EnrollmentSection({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useEnrollmentSection(turma)

  if (s.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>

  return (
    <div className="space-y-4 p-4">
      {s.error && <p className="text-sm text-red-600">{s.error}</p>}
      <EnrollmentTable enrollments={s.enrollments} onRemove={s.remove} removing={s.removing} />
      <p className="text-sm text-slate-500">
        {t('operation.enrollment.footerCount', { count: s.enrollments.length })}
      </p>
    </div>
  )
}
