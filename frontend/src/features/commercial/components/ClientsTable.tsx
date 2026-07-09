import { useState } from 'react'
import { AppDataTable, AppColumn, AppTag, AppInputText, AppButton } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

const TYPE_LABEL: Record<string, string> = { client: 'Cliente', provider: 'Proveedor', other: 'Otro' }

export function ClientsTable({
  clients, loading, onView,
}: {
  clients: ClientData[]
  loading: boolean
  onView: (c: ClientData) => void
}) {
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText
        leftIcon="pi pi-search"
        placeholder="Buscar por razón social o RUT..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <AppDataTable
        value={clients}
        loading={loading}
        globalFilter={filter}
        globalFilterFields={['legal_name', 'rut']}
        emptyMessage="Sin clientes"
      >
        <AppColumn field="legal_name" header="Razón social" sortable />
        <AppColumn field="rut" header="RUT" />
        <AppColumn header="Tipo" body={(c: ClientData) => <AppTag value={TYPE_LABEL[c.type] ?? c.type} />} />
        <AppColumn header="Comuna" body={(c: ClientData) => c.addresses[0]?.commune ?? '—'} />
        <AppColumn header="Contactos" body={(c: ClientData) => c.contacts.length} />
        <AppColumn
          body={(c: ClientData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <p className="text-sm text-slate-500">{clients.length} clientes</p>
    </div>
  )
}
