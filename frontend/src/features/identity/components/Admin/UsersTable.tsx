import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import { formatDateTime } from '@shared/lib'

export function UsersTable({
  users, loading, onView, actions, error, onRetry,
}: {
  users: UserData[]
  loading: boolean
  onView: (u: UserData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
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
          <IdentityCell title={u.name} description={u.email} image={u.photo_url} />
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
        field="last_login"
        header={t('common.lastLogin')}
        sortable
        body={(u: UserData) => (u.last_login ? formatDateTime(new Date(u.last_login)) : '—')}
      />
      <AppColumn
        body={(u: UserData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(u)} />}
        style={{ width: '4rem' }}
      />
    </SearchableTableFrame>
  )
}
