import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { useBudgetsPage } from '../hooks/useBudgetsPage'
import { ClientsTable } from './Client/ClientsTable'
import { ClientDialog } from './Client/ClientDialog'
import { BudgetsTable } from './Budget/BudgetsTable'
import { BudgetDialog } from './Budget/BudgetDialog'

export function CommercialPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const clients = useClientsPage()
  const budgets = useBudgetsPage()
  const [tab, setTab] = useState(0)

  return (
    <ModulePage title={t('module.comercial.title')} description={t('module.comercial.description')}>
      <AppCard>
        <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          <ModuleTab header={t('client.tabClients')}>
            <ClientsTable
              clients={clients.items}
              loading={clients.loading}
              onView={clients.openView}
              actions={<AppButton variant="brandIcon" label={t('client.new')} icon="pi pi-user-plus" onClick={clients.openCreate} />}
            />
          </ModuleTab>
          <ModuleTab header={t('budget.tab')}>
            <BudgetsTable
              budgets={budgets.items}
              loading={budgets.loading}
              actions={<AppButton variant="brandIcon" label={t('budget.new')} icon="pi pi-file" onClick={budgets.openCreate} />}
            />
          </ModuleTab>
        </ModuleTabs>
      </AppCard>

      {clients.dialog && (
        <ClientDialog
          visible
          mode={clients.dialog.mode}
          client={clients.dialog.entity}
          onHide={clients.close}
          onEdit={clients.startEdit}
        />
      )}

      {budgets.dialog && (
        <BudgetDialog
          visible
          mode={budgets.dialog.mode}
          budget={budgets.dialog.entity}
          onHide={budgets.close}
          onCreated={(created) => navigate(`/comercial/presupuestos/${created.id}`)}
        />
      )}
    </ModulePage>
  )
}
