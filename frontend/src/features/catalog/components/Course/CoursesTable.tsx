import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppInputText, AppButton, AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

export function CoursesTable({
  courses, loading, onView, actions,
}: {
  courses: CourseData[]
  loading: boolean
  onView: (c: CourseData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? courses
    : courses.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.technical_name ?? '').toLowerCase().includes(term),
      )

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-book" title={t('course.empty')} description={t('course.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={() => handleFilterChange('')} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('course.searchPlaceholder')}
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn field="name" header={t('course.name')} sortable />
        <AppColumn header={t('course.technicalName')} body={(c: CourseData) => c.technical_name ?? '—'} />
        <AppColumn
          header={t('course.workloadHours')}
          body={(c: CourseData) => <span className="font-semibold">{c.workload_hours}</span>}
        />
        <AppColumn
          header={t('course.redatorCount')}
          body={(c: CourseData) => <span className="font-semibold">{c.redator_ids.length}</span>}
        />
        <AppColumn
          body={(c: CourseData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('course.count', { count: rows.length })} />
    </>
  )
}
