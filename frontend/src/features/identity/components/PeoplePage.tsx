import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { RedatoresTable } from './Redator/RedatoresTable'
import { RedatorDialog } from './Redator/RedatorDialog'

export function PeoplePage() {
  const { t } = useTranslation()
  const page = useRedatoresPage()

  return (
    <ModulePage
      title={t('redator.module')}
      description={t('redator.moduleDescription')}
      actions={<AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>

        <ModuleTab header={t('redator.tabRedatores')}>
          <RedatoresTable redatores={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>

        <ModuleTab header={t('redator.tabStudents')}>
          <p className="p-4 text-sm text-slate-500">{t('redator.studentsPlaceholder')}</p>
        </ModuleTab>
      </ModuleTabs>

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
