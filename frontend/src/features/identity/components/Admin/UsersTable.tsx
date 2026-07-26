import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppInputText, AppButton,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { UserData } from '@shared/types/generated'

export function UsersTable({
  users, loading, onView, actions,
}: {
  users: UserData[]
  loading: boolean
  onView: (u: UserData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? users
    : users.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
      )

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-users" title={t('admin.empty')} description={t('admin.emptyHint')} action={actions} />
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
              placeholder={t('admin.searchPlaceholder')}
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
        <AppColumn
          field="name"
          header={t('admin.name')}
          sortable
          body={(u: UserData) => (
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{u.email}</p>
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
      <AppCardFooter count={t('admin.count', { count: rows.length })} />
    </>
  )
}
