import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns, stickyActionsColumn } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import { formatDateTime, type ArchivableRow } from '@shared/lib'
import { UserRowActions } from './UserRowActions'
import { userWidths } from './userColumns'

/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type UserRow = ArchivableRow<UserData>

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
  const largura = userWidths(archived)
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
        style={largura.name}
      />
      <AppColumn header={t('admin.role')} body={(u: UserData) => u.role} style={largura.role} />
      <AppColumn
        header={t('admin.state')}
        body={(u: UserData) => (
          <AppTag
            value={u.is_active ? t('common.active') : t('common.inactive')}
            severity={u.is_active ? 'success' : 'danger'}
          />
        )}
        style={largura.state}
      />
      <AppColumn
        field="last_login"
        header={t('common.lastLogin')}
        sortable
        body={(u: UserData) => (u.last_login ? formatDateTime(new Date(u.last_login)) : '—')}
        style={largura.lastLogin}
      />
      {archived && archivedColumns(t)}
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
        style={stickyActionsColumn('9rem')}
      />
    </SearchableTableFrame>
  )
}
