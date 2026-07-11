import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppInputText, AppButton } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

export function CoursesTable({
  courses, loading, onView,
}: {
  courses: CourseData[]
  loading: boolean
  onView: (c: CourseData) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('course.searchPlaceholder')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <AppDataTable
        value={courses}
        loading={loading}
        globalFilter={filter}
        globalFilterFields={['name', 'technical_name']}
        emptyMessage={t('course.empty')}
      >
        <AppColumn field="name" header={t('course.name')} sortable />
        <AppColumn header={t('course.technicalName')} body={(c: CourseData) => c.technical_name ?? '—'} />
        <AppColumn header={t('course.workloadHours')} body={(c: CourseData) => c.workload_hours} />
        <AppColumn header={t('course.redatorCount')} body={(c: CourseData) => c.redator_ids.length} />
        <AppColumn
          body={(c: CourseData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <p className="text-sm text-slate-500">{t('course.count', { count: courses.length })}</p>
    </div>
  )
}
