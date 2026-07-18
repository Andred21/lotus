import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppTag, AppButton } from '@shared/ui'
import type { RoleData } from '@shared/types/generated'

export function RolesTable({
  roles, loading, onView,
}: {
  roles: RoleData[]
  loading: boolean
  onView: (r: RoleData) => void
}) {
  const { t } = useTranslation()

  return (
    <AppDataTable value={roles} loading={loading} emptyMessage={t('role.empty')}>
      <AppColumn field="name" header={t('role.name')} sortable />
      <AppColumn header={t('role.kind')} body={(r: RoleData) => (
        <AppTag value={r.is_system ? t('role.system') : t('role.custom')} severity={r.is_system ? 'info' : 'success'} />
      )} />
      <AppColumn header={t('role.permissions')} body={(r: RoleData) => r.permissions.length} />
      <AppColumn body={(r: RoleData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(r)} />} style={{ width: '4rem' }} />
    </AppDataTable>
  )
}
