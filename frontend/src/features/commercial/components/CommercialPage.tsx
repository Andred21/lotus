import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard, ConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { ClientData } from '@shared/types/generated'
import { useClientsPage } from '../hooks/useClientsPage'
import { useClientsArchived } from '../hooks/useClientsArchived'
import { useBudgetsPage } from '../hooks/useBudgetsPage'
import { ClientsTable } from './Client/ClientsTable'
import { ClientDialog } from './Client/ClientDialog'
import { BudgetsTable } from './Budget/BudgetsTable'
import { BudgetDialog } from './Budget/BudgetDialog'

export function CommercialPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const clients = useClientsPage()
  const clientsArchived = useClientsArchived()
  const budgets = useBudgetsPage()
  const [tab, setTab] = useState(0)
  const [toArchive, setToArchive] = useState<ClientData | null>(null)
  const archived = clientsArchived.mode === 'archived'

  return (
    <ModulePage title={t('module.comercial.title')} description={t('module.comercial.description')}>
      <AppCard>
        <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          <ModuleTab header={t('client.tabClients')}>
            <ClientsTable
              clients={archived ? clientsArchived.items : clients.items}
              loading={archived ? clientsArchived.loading : clients.loading}
              error={archived ? clientsArchived.error : clients.error}
              onRetry={archived ? clientsArchived.refetch : clients.refetch}
              mode={clientsArchived.mode}
              onModeChange={clientsArchived.setMode}
              onArchive={setToArchive}
              onRestore={(c) => c.id != null && clientsArchived.restore(c.id)}
              busy={clientsArchived.restoring || clientsArchived.archiving}
              onView={clients.openView}
              actions={
                can('commercial.client.create')
                  ? <AppButton variant="brandIcon" label={t('client.new')} icon="pi pi-user-plus" onClick={clients.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>
          <ModuleTab header={t('budget.tab')}>
            <BudgetsTable
              budgets={budgets.items}
              loading={budgets.loading}
              error={budgets.error}
              onRetry={budgets.refetch}
              actions={
                can('commercial.budget.create')
                  ? <AppButton variant="brandIcon" label={t('budget.new')} icon="pi pi-file" onClick={budgets.openCreate} />
                  : undefined
              }
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

      {/* Restaurar NÃO pede confirmação: não é destrutivo (spec D9). */}
      {toArchive && (
        <ConfirmDialog
          visible
          title={t('archive.confirmArchiveTitle')}
          message={t('archive.confirmArchiveBody')}
          confirmLabel={t('archive.archiveAction')}
          severity="danger"
          pending={clientsArchived.archiving}
          onConfirm={() =>
            toArchive.id != null &&
            clientsArchived.archive(toArchive.id, { onSuccess: () => setToArchive(null) })
          }
          onCancel={() => setToArchive(null)}
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
