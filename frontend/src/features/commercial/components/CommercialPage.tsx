import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { useBudgetsPage } from '../hooks/useBudgetsPage'
import { ClientsTable } from './Client/ClientsTable'
import { ClientDialog } from './Client/ClientDialog'
import { BudgetsTable } from './Budget/BudgetsTable'
import { BudgetDialog } from './Budget/BudgetDialog'

export function CommercialPage() {
  const { t } = useTranslation()
  const clients = useClientsPage()
  const budgets = useBudgetsPage()
  const [tab, setTab] = useState(0)

  const onBudgets = tab === 1

  return (
    <ModulePage
      title={t('client.module')}
      description={t('client.moduleDescription')}
      actions={
        onBudgets ? (
          <AppButton variant="brandIcon" label={t('budget.new')} icon="pi pi-file" onClick={budgets.openCreate} />
        ) : (
          <AppButton variant="brandIcon" label={t('client.new')} icon="pi pi-user-plus" onClick={clients.openCreate} />
        )
      }
    >
      <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
        <ModuleTab header={t('client.tabClients')}>
          <ClientsTable clients={clients.items} loading={clients.loading} onView={clients.openView} />
        </ModuleTab>
        <ModuleTab header={t('budget.tab')}>
          <BudgetsTable budgets={budgets.items} loading={budgets.loading} />
        </ModuleTab>
      </ModuleTabs>

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
        <BudgetDialog visible mode={budgets.dialog.mode} budget={budgets.dialog.entity} onHide={budgets.close} />
      )}
    </ModulePage>
  )
}
