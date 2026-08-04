import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import { AppColumn, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { BRAND_COLOR } from '@shared/config/brand'

export function CoursesTable({
  courses, loading, onView, actions, error, onRetry,
}: {
  courses: CourseData[]
  loading: boolean
  onView: (c: CourseData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(courses, (c) => [c.name, c.technical_name])

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('course.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-book" title={t('course.empty')} description={t('course.emptyHint')} action={actions} />
      }
      footerCount={t('course.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="name"
        header={t('course.name')}
        sortable
        body={(c: CourseData) => (
          <div className="flex items-center gap-3">
            <i className="pi pi-book" style={{ color: BRAND_COLOR, fontSize: '1.25rem' }} />
            <span className="font-medium">{c.name}</span>
          </div>
        )}
      />
      <AppColumn
        header={t('course.technicalName')}
        body={(c: CourseData) => c.technical_name ?? '—'}
      />
      <AppColumn
        header={t('course.workloadHours')}
        body={(c: CourseData) => (
          <span className="font-semibold">{c.workload_hours}</span>
        )}
      />
      <AppColumn
        header={t('course.redatorCount')}
        body={(c: CourseData) => (
          <span className="font-semibold">{c.redator_ids.length}</span>
        )}
      />
      <AppColumn
        body={(c: CourseData) => (
          <AppButton
            icon="pi pi-eye"
            text
            rounded
            aria-label={t('common.view')}
            onClick={() => onView(c)}
          />
        )}
        style={{ width: '4rem' }}
      />
    </SearchableTableFrame>
  )
}
