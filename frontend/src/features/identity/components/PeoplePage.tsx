import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { useStudentsPage } from '../hooks/useStudentsPage'
import { RedatoresTable } from './Redator/RedatoresTable'
import { RedatorDialog } from './Redator/RedatorDialog'
import { StudentsTable } from './Student/StudentsTable'
import { StudentDialog } from './Student/StudentDialog'

export function PeoplePage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const page = useRedatoresPage()
  const students = useStudentsPage()

  return (
    <ModulePage title={t('module.personas.title')} description={t('module.personas.description')}>
      <AppCard>
        <ModuleTabs>
          <ModuleTab header={t('redator.tabRedatores')}>
            <RedatoresTable
              redatores={page.items}
              loading={page.loading}
              error={page.error}
              onRetry={page.refetch}
              onView={page.openView}
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>

          <ModuleTab header={t('redator.tabStudents')}>
            <StudentsTable
              students={students.items}
              loading={students.loading}
              error={students.error}
              onRetry={students.refetch}
              onView={students.openView}
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('student.new')} icon="pi pi-user-plus" onClick={students.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>
        </ModuleTabs>
      </AppCard>

      {page.dialog && (
        <RedatorDialog
          visible
          mode={page.dialog.mode}
          redator={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}

      {students.dialog && (
        <StudentDialog
          visible
          mode={students.dialog.mode}
          student={students.dialog.entity}
          onHide={students.close}
          onEdit={students.startEdit}
        />
      )}
    </ModulePage>
  )
}
