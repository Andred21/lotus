import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard, ArchiveConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { ClientData } from '@shared/types/generated'
import { archivableSource } from '@shared/lib'
import { useClientsPage } from '../hooks/useClientsPage'
import { useClientsArchived } from '../hooks/useClientsArchived'
import { useBudgetsPage } from '../hooks/useBudgetsPage'
import { useBudgetsArchived } from '../hooks/useBudgetsArchived'
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
  const budgetsArchived = useBudgetsArchived()
  const [tab, setTab] = useState(0)
  const [toArchive, setToArchive] = useState<ClientData | null>(null)
  // Duas abas, duas fontes: as condições são DIFERENTES (clientes e orçamentos têm
  // interruptores próprios), então são duas chamadas, não uma (D-52).
  const fonteClientes = archivableSource(clients, clientsArchived)
  const fonteOrcamentos = archivableSource(budgets, budgetsArchived)

  return (
    <ModulePage title={t('module.comercial.title')} description={t('module.comercial.description')}>
      <AppCard>
        <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          <ModuleTab header={t('client.tabClients')}>
            <ClientsTable
              clients={fonteClientes.items}
              loading={fonteClientes.loading}
              error={fonteClientes.error}
              onRetry={fonteClientes.refetch}
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
              budgets={fonteOrcamentos.items}
              loading={fonteOrcamentos.loading}
              error={fonteOrcamentos.error}
              onRetry={fonteOrcamentos.refetch}
              mode={budgetsArchived.mode}
              onModeChange={budgetsArchived.setMode}
              onRestore={(b) => b.id != null && budgetsArchived.restore(b.id)}
              busy={budgetsArchived.restoring}
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

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      <ArchiveConfirmDialog
        target={toArchive}
        pending={clientsArchived.archiving}
        onArchive={clientsArchived.archive}
        onCancel={() => setToArchive(null)}
      />

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
