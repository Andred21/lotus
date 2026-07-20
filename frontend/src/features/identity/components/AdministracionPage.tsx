import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useUsersPage } from '../hooks/useUsersPage'
import { useRolesPage } from '../hooks/useRolesPage'
import { UsersTable } from './Admin/UsersTable'
import { StaffUserDialog } from './Admin/StaffUserDialog'
import { RolesTable } from './Admin/RolesTable'
import { RoleDialog } from './Admin/RoleDialog'

export function AdministracionPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canManage = can('identity.access.manage')
  const page = useUsersPage()
  const rolesPage = useRolesPage()
  const [tab, setTab] = useState(0)

  const onRoles = tab === 1

  return (
    <ModulePage
      title={t('admin.module')}
      description={t('admin.moduleDescription')}
      actions={
        canManage ? (
          onRoles ? (
            <AppButton variant="brandIcon" label={t('role.new')} icon="pi pi-plus" onClick={rolesPage.openCreate} />
          ) : (
            <AppButton variant="brandIcon" label={t('admin.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
          )
        ) : null
      }
    >
      <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
        <ModuleTab header={t('admin.tabUsers')}>
          <UsersTable users={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
        {canManage && (
          <ModuleTab header={t('admin.tabRoles')}>
            <RolesTable roles={rolesPage.items} loading={rolesPage.loading} onView={rolesPage.openView} />
          </ModuleTab>
        )}
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

      {rolesPage.dialog && (
        <RoleDialog
          visible
          mode={rolesPage.dialog.mode}
          role={rolesPage.dialog.entity}
          canManage={canManage}
          onHide={rolesPage.close}
          onEdit={rolesPage.startEdit}
        />
      )}
    </ModulePage>
  )
}
