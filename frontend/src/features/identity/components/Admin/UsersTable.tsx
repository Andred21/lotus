import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import {
  AppDataTable, AppColumn, AppAvatar, AppTag, AppInputText, AppButton,
  AppCardToolbar, AppEmptyState,
} from '@shared/ui'
import type { UserData } from '@shared/types/generated'

export function UsersTable({
  users, loading, onView, actions, error, onRetry,
}: {
  users: UserData[]
  loading: boolean
  onView: (u: UserData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(users, (u) => [u.name, u.email])

  const empty = table.term === '' ? (
    <AppEmptyState icon="pi pi-users" title={t('admin.empty')} description={t('admin.emptyHint')} action={actions} />
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
              placeholder={t('admin.searchPlaceholder')}
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
        footerCount={t('admin.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
      >
        <AppColumn
          field="name"
          header={t('admin.name')}
          sortable
          body={(u: UserData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={u.name} image={u.photo_url} size="large" />
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{u.email}</p>
              </div>
            </div>
          )}
        />
        <AppColumn header={t('admin.role')} body={(u: UserData) => u.role} />
        <AppColumn
          header={t('admin.state')}
          body={(u: UserData) => (
            <AppTag
              value={u.is_active ? t('common.active') : t('common.inactive')}
              severity={u.is_active ? 'success' : 'danger'}
            />
          )}
        />
        <AppColumn
          body={(u: UserData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(u)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
    </>
  )
}
