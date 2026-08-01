import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import {
  AppDataTable, AppColumn, AppAvatar, AppInputText, AppButton,
  AppCardToolbar, AppEmptyState,
} from '@shared/ui'
import type { StudentData } from '@shared/types/generated'

export function StudentsTable({
  students, loading, onView, actions, error, onRetry,
}: {
  students: StudentData[]
  loading: boolean
  onView: (s: StudentData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(students, (s) => [s.name, s.rut])

  const empty = table.term === '' ? (
    <AppEmptyState icon="pi pi-user" title={t('student.empty')} description={t('student.emptyHint')} action={actions} />
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
              placeholder={t('student.searchPlaceholder')}
              value={table.filter}
              onChange={(e) => table.onFilterChange(e.target.value)}
            />
          </div>
        }
        end={error ? undefined : actions}
      />
      <AppDataTable
        value={table.rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={t('student.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
      >
        <AppColumn
          field="name"
          header={t('student.name')}
          sortable
          body={(s: StudentData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={s.name} image={s.photo_url} size="normal" />
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{s.email}</p>
              </div>
            </div>
          )}
        />
        <AppColumn
          header={t('common.rut')}
          body={(s: StudentData) => <span className="font-mono text-sm">{s.rut}</span>}
        />
        <AppColumn
          header={t('student.currentClient')}
          body={(s: StudentData) =>
            s.current_client_name ?? (
              <span style={{ color: 'var(--text-color-secondary)' }}>{t('student.noClient')}</span>
            )
          }
        />
        <AppColumn
          header={t('student.turmas')}
          body={(s: StudentData) => <span className="font-semibold">{s.enrollments_count}</span>}
        />
        <AppColumn
          body={(s: StudentData) => (
            <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(s)} />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
    </>
  )
}
