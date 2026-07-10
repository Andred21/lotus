import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { RedatoresTable } from './Redator/RedatoresTable'
import { RedatorDialog } from './Redator/RedatorDialog'

export function PeoplePage() {
  const page = useRedatoresPage()

  return (
    <ModulePage
      title="Personas"
      description="Registro canónico de alumnos y redactores"
      actions={<AppButton variant="brandIcon" label="Nuevo redactor" icon="pi pi-user-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>
        
        <ModuleTab header="Redactores">
          <RedatoresTable redatores={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>

        <ModuleTab header="Alumnos">
          <p className="p-4 text-sm text-slate-500">Módulo de alumnos — próxima sprint.</p>
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
