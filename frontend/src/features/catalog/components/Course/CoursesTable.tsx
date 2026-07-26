import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import {
  AppDataTable, AppColumn, AppInputText, AppButton, AppCardToolbar, AppEmptyState,
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
  const table = useTableFilter(courses, (c) => [c.name, c.technical_name])

  const empty = table.term === '' ? (
    <AppEmptyState icon="pi pi-book" title={t('course.empty')} description={t('course.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: table.filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={table.clear} />}
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
              value={table.filter}
              onChange={(e) => table.onFilterChange(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable
        value={table.rows}
        loading={loading}
        emptyMessage={empty}
        footerCount={t('course.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
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
    </>
  )
}
