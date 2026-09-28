import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns, narrowFloorTablePt, stickyActionsColumn, useCollapsibleActionsColumn, Timestamp } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import { roleLabel, type ArchivableRow } from '@shared/lib'
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
  // Abaixo de `sm` arquivar e ver colapsam num menu e a coluna encolhe junto —
  // em 390x844 ela cobria o nome (Q-1 do review de 2026-09-26).
  const colunaDeAcoes = useCollapsibleActionsColumn(archived ? '10rem' : '9rem')

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
      // Piso de 390 medido (item 23, audit §5): 149px de 1ª coluna contra 204px livres.
      // Varrido no navegador (audit §5, Step 4): acima de 42rem a presa também cresce com
      // `table-fixed` e o livre encolhe; 56rem é o teto com box 0 (col1 201px, livre 186px,
      // margem 1px). Não alcança o col1 da ativa (204px): nenhum piso fecha as duas pernas.
      pt={archived ? narrowFloorTablePt('56rem') : undefined}
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
      <AppColumn header={t('admin.role')} body={(u: UserData) => roleLabel(u.role, t)} style={largura.role} />
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
        body={(u: UserData) => (u.last_login ? <Timestamp value={new Date(u.last_login)} /> : '—')}
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
            collapsed={colunaDeAcoes.collapsed}
          />
        )}
        style={stickyActionsColumn(colunaDeAcoes.width)}
      />
    </SearchableTableFrame>
  )
}
