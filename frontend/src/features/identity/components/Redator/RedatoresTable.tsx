import { useState } from 'react'
import { AppDataTable, AppColumn, AppTag, AppInputText, AppButton } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade } from '../../lib/redatorStatus'

const IDON_TAG: Record<string, { value: string; severity: 'success' | 'warning' | 'danger' }> = {
  idoneo: { value: 'Idóneo', severity: 'success' },
  por_vencer: { value: 'Por vencer', severity: 'warning' },
  no_idoneo: { value: 'No idóneo', severity: 'danger' },
}

export function RedatoresTable({
  redatores, loading, onView,
}: {
  redatores: RedatorData[]
  loading: boolean
  onView: (r: RedatorData) => void
}) {
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText leftIcon="pi pi-search" placeholder="Buscar por nombre o RUT..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      <AppDataTable value={redatores} loading={loading} globalFilter={filter} globalFilterFields={['name', 'rut']} emptyMessage="Sin redactores">
        <AppColumn field="name" header="Nombre" sortable body={(r: RedatorData) => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-slate-500">{r.email}</p>
          </div>
        )} />
        <AppColumn field="rut" header="RUT" />
        <AppColumn header="Cursos habilitados" body={(r: RedatorData) => r.course_ids.length} />
        <AppColumn header="Idoneidad" body={(r: RedatorData) => {
          const t = IDON_TAG[idoneidade(r)]
          return <AppTag value={t.value} severity={t.severity} />
        }} />
        <AppColumn body={(r: RedatorData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(r)} />} style={{ width: '4rem' }} />
      </AppDataTable>
      <p className="text-sm text-slate-500">{redatores.length} redactores</p>
    </div>
  )
}
