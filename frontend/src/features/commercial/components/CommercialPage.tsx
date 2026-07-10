import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { ClientsTable } from './ClientsTable'
import { ClientDialog } from './ClientDialog'

export function CommercialPage() {
  const page = useClientsPage()

  return (
    <ModulePage
      title="Comercial"
      description="Gestión de clientes y presupuestos de capacitación"
      actions={<AppButton variant="brandIcon" label="Nuevo cliente" icon="pi pi-user-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>
        <ModuleTab header="Clientes">
          <ClientsTable clients={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
        <ModuleTab header="Presupuestos">
          <p className="p-4 text-sm text-slate-500">Módulo de presupuestos — próxima sprint.</p>
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
