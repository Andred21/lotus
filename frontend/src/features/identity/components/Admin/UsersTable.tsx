import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import { AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
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

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('admin.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-users" title={t('admin.empty')} description={t('admin.emptyHint')} action={actions} />
      }
      footerCount={t('admin.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
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
    </SearchableTableFrame>
  )
}
