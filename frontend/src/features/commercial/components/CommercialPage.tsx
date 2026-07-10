import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { ClientsTable } from './Client/ClientsTable'
import { ClientDialog } from './Client/ClientDialog'

export function CommercialPage() {
  const { t } = useTranslation()
  const page = useClientsPage()

  return (
    <ModulePage
      title={t('client.module')}
      description={t('client.moduleDescription')}
      actions={<AppButton variant="brandIcon" label={t('client.new')} icon="pi pi-user-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>
        <ModuleTab header={t('client.tabClients')}>
          <ClientsTable clients={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
        <ModuleTab header={t('client.tabBudgets')}>
          <p className="p-4 text-sm text-slate-500">{t('client.budgetsPlaceholder')}</p>
        </ModuleTab>
      </ModuleTabs>

      {page.dialog && (
        <ClientDialog
          visible
          mode={page.dialog.mode}
          client={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
