import { PageHeader, AppButton, AppTabView, AppTabPanel } from '@shared/ui'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { RedatoresTable } from './RedatoresTable'
import { RedatorDialog } from './RedatorDialog'

export function PersonasPage() {
  const page = useRedatoresPage()

  return (
    <div>
      <PageHeader
        title="Personas"
        description="Registro canónico de alumnos y redactores"
        actions={<AppButton variant='brandIcon' label="Nuevo redactor" icon="pi pi-user-plus" onClick={page.openCreate} />}
      />
      <AppTabView>
        <AppTabPanel header="Alumnos">
          <p className="p-4 text-sm text-slate-500">Módulo de alumnos — próxima sprint.</p>
        </AppTabPanel>
        <AppTabPanel header="Redactores">
          <RedatoresTable redatores={page.redatores} loading={page.loading} onView={page.openView} />
        </AppTabPanel>
      </AppTabView>

      {page.dialog && (
        <RedatorDialog
          visible
          mode={page.dialog.mode}
          redator={page.dialog.redator}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </div>
  )
}
