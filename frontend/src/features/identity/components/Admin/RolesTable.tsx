import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppButton, AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { RoleData } from '@shared/types/generated'

export function RolesTable({
  roles, loading, onView, actions,
}: {
  roles: RoleData[]
  loading: boolean
  onView: (r: RoleData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()

  // Sem busca nesta aba: só um vazio possível, o de "sem dado".
  const empty = (
    <AppEmptyState icon="pi pi-shield" title={t('role.empty')} description={t('role.emptyHint')} action={actions} />
  )

  return (
    <>
      {/* Aba sem busca: o grupo de botões vai no slot ESQUERDO (spec D1). */}
      <AppCardToolbar start={actions} />
      <AppDataTable value={roles} loading={loading} emptyMessage={loading ? undefined : empty}>
        <AppColumn field="name" header={t('role.name')} sortable />
        <AppColumn
          header={t('role.kind')}
          body={(r: RoleData) => (
            <AppTag value={r.is_system ? t('role.system') : t('role.custom')} severity={r.is_system ? 'info' : 'success'} />
          )}
        />
        <AppColumn
          header={t('role.permissions')}
          body={(r: RoleData) => <span className="font-semibold">{r.permissions.length}</span>}
        />
        <AppColumn
          body={(r: RoleData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(r)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('role.count', { count: roles.length })} />
    </>
  )
}
