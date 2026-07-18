import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useUsersPage } from '../hooks/useUsersPage'
import { UsersTable } from './Admin/UsersTable'
import { StaffUserDialog } from './Admin/StaffUserDialog'

export function AdministracionPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canManage = can('identity.access.manage')
  const page = useUsersPage()

  return (
    <ModulePage
      title={t('admin.module')}
      description={t('admin.moduleDescription')}
      actions={canManage ? <AppButton variant="brandIcon" label={t('admin.new')} icon="pi pi-user-plus" onClick={page.openCreate} /> : null}
    >
      <ModuleTabs>
        <ModuleTab header={t('admin.tabUsers')}>
          <UsersTable users={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
      </ModuleTabs>

      {page.dialog && (
        <StaffUserDialog
          visible
          mode={page.dialog.mode}
          user={page.dialog.entity}
          canManage={canManage}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
