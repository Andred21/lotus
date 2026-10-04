import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppButton, AppCardToolbar, AppEmptyState, narrowFloorTablePt,
  stickyActionsColumn, useCollapsibleActionsColumn,
} from '@shared/ui'
import type { RoleData } from '@shared/types/generated'
import { roleLabel } from '@shared/lib'
import { roleWidths } from './roleColumns'

export function RolesTable({
  roles, loading, onView, actions, error, onRetry,
}: {
  roles: RoleData[]
  loading: boolean
  onView: (r: RoleData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const largura = roleWidths()
  // Uma ação só, nada a colapsar: no telefone a coluna encolhe para o botão e
  // devolve ao nome a faixa que os 6rem comiam (Q-1 do review de 2026-09-26).
  const colunaDeAcoes = useCollapsibleActionsColumn('6rem')

  // Sem busca nesta aba: só um vazio possível, o de "sem dado".
  const empty = (
    <AppEmptyState icon="pi pi-shield" title={t('role.empty')} description={t('role.emptyHint')} action={actions} />
  )

  return (
    <>
      {/* Aba sem busca: o grupo de botões vai no slot ESQUERDO (spec D1). */}
      <AppCardToolbar start={error ? undefined : actions} />
      <AppDataTable
        value={roles}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={t('role.count', { count: roles.length })}
        // Piso de 390 medido (item 23, audit §5): 332px de 1ª coluna contra 204px livres.
        pt={narrowFloorTablePt('27.75rem')}
      >
        <AppColumn
          field="name"
          header={t('role.name')}
          sortable
          body={(r: RoleData) => roleLabel(r.name, t)}
          style={largura.name}
        />
        <AppColumn
          header={t('role.kind')}
          style={largura.kind}
          body={(r: RoleData) => (
            <AppTag value={r.is_system ? t('role.system') : t('role.custom')} severity={r.is_system ? 'info' : 'success'} />
          )}
        />
        <AppColumn
          header={t('role.permissions')}
          style={largura.permissions}
          body={(r: RoleData) => <span className="font-semibold">{r.permissions.length}</span>}
        />
        <AppColumn
          body={(r: RoleData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(r)} />}
          style={stickyActionsColumn(colunaDeAcoes.width)}
        />
      </AppDataTable>
    </>
  )
}
