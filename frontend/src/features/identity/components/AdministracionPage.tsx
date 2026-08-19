import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard, ConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { UserData } from '@shared/types/generated'
import { useUsersPage } from '../hooks/useUsersPage'
import { useUsersArchived } from '../hooks/useUsersArchived'
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
  const usersArchived = useUsersArchived()
  const [toArchive, setToArchive] = useState<UserData | null>(null)
  const archived = usersArchived.mode === 'archived'
  const [tab, setTab] = useState(0)

  return (
    <ModulePage title={t('module.administracion.title')} description={t('module.administracion.description')}>
      <AppCard>
        <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          <ModuleTab header={t('admin.tabUsers')}>
            <UsersTable
              users={archived ? usersArchived.items : page.items}
              loading={archived ? usersArchived.loading : page.loading}
              error={archived ? usersArchived.error : page.error}
              onRetry={archived ? usersArchived.refetch : page.refetch}
              mode={usersArchived.mode}
              onModeChange={usersArchived.setMode}
              onArchive={setToArchive}
              onRestore={(u) => u.id != null && usersArchived.restore(u.id)}
              busy={usersArchived.restoring || usersArchived.archiving}
              onView={page.openView}
              actions={
                canManage
                  ? <AppButton variant="brandIcon" label={t('admin.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>
          {canManage && (
            <ModuleTab header={t('admin.tabRoles')}>
              <RolesTable
                roles={rolesPage.items}
                loading={rolesPage.loading}
                error={rolesPage.error}
                onRetry={rolesPage.refetch}
                onView={rolesPage.openView}
                actions={<AppButton variant="brandIcon" label={t('role.new')} icon="pi pi-plus" onClick={rolesPage.openCreate} />}
              />
            </ModuleTab>
          )}
        </ModuleTabs>
      </AppCard>

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

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      {toArchive && (
        <ConfirmDialog
          visible
          title={t('archive.confirmArchiveTitle')}
          message={t('archive.confirmArchiveBody')}
          confirmLabel={t('archive.archiveAction')}
          severity="danger"
          pending={usersArchived.archiving}
          onConfirm={() =>
            toArchive.id != null &&
            usersArchived.archive(toArchive.id, { onSuccess: () => setToArchive(null) })
          }
          onCancel={() => setToArchive(null)}
        />
      )}
    </ModulePage>
  )
}
