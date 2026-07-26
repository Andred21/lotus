import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard, AppEmptyState } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { RedatoresTable } from './Redator/RedatoresTable'
import { RedatorDialog } from './Redator/RedatorDialog'

export function PeoplePage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const page = useRedatoresPage()

  return (
    <ModulePage title={t('module.personas.title')} description={t('module.personas.description')}>
      <AppCard>
        <ModuleTabs>
          <ModuleTab header={t('redator.tabRedatores')}>
            <RedatoresTable
              redatores={page.items}
              loading={page.loading}
              onView={page.openView}
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>

          <ModuleTab header={t('redator.tabStudents')}>
            {/* Módulo de alunos é backlog item 2 (não existe endpoint). Aqui só
                deixa de ser um <p> solto e passa a usar o empty state padrão. */}
            <AppEmptyState
              icon="pi pi-user"
              title={t('redator.tabStudents')}
              description={t('redator.studentsPlaceholder')}
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
    </ModulePage>
  )
}
