import { PageHeader, AppButton, AppTabView, AppTabPanel } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { ClientsTable } from './ClientsTable'
import { ClientDialog } from './ClientDialog'

export function CommercialPage() {
  const page = useClientsPage()

  return (
    <div>
      <PageHeader
        title="Comercial"
        description="Gestión de clientes y presupuestos de capacitación"
        actions={<AppButton  variant='brandIcon'label="Nuevo cliente" icon="pi pi-user-plus" onClick={page.openCreate} />}
      />
      <AppTabView>
        <AppTabPanel header="Clientes">
          <ClientsTable clients={page.clients} loading={page.loading} onView={page.openView} />
        </AppTabPanel>
        <AppTabPanel header="Presupuestos">
          <p className="p-4 text-sm text-slate-500">Módulo de presupuestos — próxima sprint.</p>
        </AppTabPanel>
      </AppTabView>

      {page.dialog && (
        <ClientDialog
          visible
          mode={page.dialog.mode}
          client={page.dialog.client}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </div>
  )
}
