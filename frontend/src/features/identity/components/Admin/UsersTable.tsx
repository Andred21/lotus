import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppEmptyState, ArchiveSwitch, SearchableTableFrame } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import { formatDateTime } from '@shared/lib'
import { UserRowActions } from './UserRowActions'

/** A mesma tabela serve as duas fontes. Molde: `ClientRow`. */
export type UserRow = UserData & {
  archived_at?: string
  archived_by?: string | null
}

export function UsersTable({
  users, loading, onView, actions, error, onRetry,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  users: UserRow[]
  loading: boolean
  onView: (u: UserData) => void
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (u: UserData) => void
  onRestore: (u: UserData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const archived = mode === 'archived'
  const table = useTableFilter(users, (u) => [u.name, u.email])

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('admin.searchPlaceholder')}
      emptyState={
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-users'}
          title={archived ? t('archive.empty') : t('admin.empty')}
          description={archived ? t('archive.emptyHint') : t('admin.emptyHint')}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t('admin.count', { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
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
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(u: UserRow) => (u.archived_at ? new Date(u.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(u: UserRow) => u.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
      <AppColumn
        body={(u: UserRow) => (
          <UserRowActions
            user={u}
            archived={archived}
            busy={busy}
            onView={onView}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        )}
        style={{ width: '8rem' }}
      />
    </SearchableTableFrame>
  )
}
