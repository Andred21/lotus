import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImportRowStatus } from '@shared/types/generated'
import {
  AppColumn, AppDataTable, AppEmptyState, AppRadioButton, AppTag, COL, RowActions, tableWidths,
  identifierClass, narrowFloorTablePt, stickyActionsColumn, technicalDataClass,
  useCollapsibleActionsColumn, type RowAction,
} from '@shared/ui'
import type { TriageRow } from '../../hooks/useImportStudentsFlow'
import { ImportRowEditor, type RowFields } from './ImportRowEditor'

type Props = {
  rows: TriageRow[]
  canUpdateRegistration: boolean
  /** Empresa da turma: o destino da troca ("Enel → CGE"). */
  clientName?: string
  onEdit: (row: number, patch: RowFields) => void
  onRemove: (row: number) => void
  onSetUpdate: (row: number, value: boolean) => void
}

const TAG: Record<ImportRowStatus, 'success' | 'secondary' | 'warning' | 'danger'> = {
  new: 'success', registered: 'secondary', moves: 'warning', already_enrolled: 'secondary', error: 'danger',
}
const isRegistered = (r: TriageRow) => r.status === 'registered' || r.status === 'moves'
const FIELD_VALUE = { name: 'registered_name', email: 'registered_email', phone: 'registered_phone' } as const

// A situação carrega tag e até três linhas de apoio: pesa mais que o texto livre.
const largura = tableWidths({
  row: COL.count, rut: COL.rut, name: COL.text, email: COL.text, situation: { weight: 30 },
})

function Note({ children }: { children: string }) {
  return <div className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{children}</div>
}

/** Situação: a tag mais as linhas secundárias que explicam o que vai acontecer. */
function Situation({ r, clientName, canUpdate, onSetUpdate }: {
  r: TriageRow; clientName?: string; canUpdate: boolean; onSetUpdate: Props['onSetUpdate']
}) {
  const { t } = useTranslation()
  const k = (key: string, opts?: Record<string, unknown>) => t(`operation.enrollment.import.${key}`, opts)
  const divergent = isRegistered(r) && (r.divergent.length > 0 || r.edited)
  const registry = r.divergent.map((f) => r[FIELD_VALUE[f as keyof typeof FIELD_VALUE]]).filter(Boolean).join(' · ')
  return (
    <div className="space-y-1">
      <AppTag severity={divergent && r.status === 'registered' ? 'warning' : TAG[r.status]} value={k(divergent && r.status === 'registered' ? 'situation.divergent' : `situation.${r.status}`)} />
      {r.status === 'moves' && r.current_client && (
        <Note>{clientName ? k('note.moves', { from: r.current_client, to: clientName }) : k('note.movesFrom', { from: r.current_client })}</Note>
      )}
      {r.archived && <Note>{k('note.archived')}</Note>}
      {isRegistered(r) && registry && <Note>{k('note.registry', { values: registry })}</Note>}
      {r.status === 'already_enrolled' && <Note>{k('note.skipped')}</Note>}
      {r.status === 'error' && r.message && <Note>{r.message}</Note>}
      {r.edited && <Note>{k('note.edited')}</Note>}
      {canUpdate && divergent && (
        <div role="radiogroup" className="space-y-1 pt-1 text-sm">
          {[false, true].map((update) => (
            <div key={String(update)} className="flex items-center gap-2">
              <AppRadioButton
                inputId={`import-${r.row}-${update ? 'update' : 'keep'}`}
                name={`import-update-${r.row}`}
                checked={r.update_registration === update}
                onChange={() => onSetUpdate(r.row, update)}
              />
              <label htmlFor={`import-${r.row}-${update ? 'update' : 'keep'}`}>{k(update ? 'update' : 'keep')}</label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Tabela da triagem (D7). Toda a decisão vive no hook; aqui só se mostra e se aciona. */
export function ImportTriageTable({ rows, canUpdateRegistration, clientName, onEdit, onRemove, onSetUpdate }: Props) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<number | null>(null)
  const actionsColumn = useCollapsibleActionsColumn('7rem')

  if (rows.length === 0) {
    return <AppEmptyState icon="pi pi-inbox" title={t('operation.enrollment.import.empty')} />
  }

  const actions = (r: TriageRow): RowAction[] => [
    ...(r.status !== 'already_enrolled' && (!isRegistered(r) || canUpdateRegistration)
      ? [{ label: t('operation.enrollment.import.editRow'), icon: 'pi pi-pencil', tooltip: true, onClick: () => setEditing(r.row) }]
      : []),
    { label: t('operation.enrollment.import.removeRow'), icon: 'pi pi-times', tooltip: true, severity: 'danger' as const, onClick: () => onRemove(r.row) },
  ]
  const col = (key: string) => t(`operation.enrollment.import.col.${key}`)

  return (
    <AppDataTable
      value={rows}
      dataKey="row"
      rows={100}
      pt={narrowFloorTablePt('48rem')}
      expandedRows={editing === null ? undefined : { [editing]: true }}
      rowExpansionTemplate={(r: TriageRow) => (
        <ImportRowEditor row={r} onCancel={() => setEditing(null)} onSave={(patch) => { onEdit(r.row, patch); setEditing(null) }} />
      )}
    >
      <AppColumn header={col('row')} body={(r: TriageRow) => <span className={technicalDataClass}>{r.row}</span>} style={largura.row} />
      <AppColumn header={col('rut')} body={(r: TriageRow) => <span className={identifierClass}>{r.rut}</span>} style={largura.rut} />
      <AppColumn header={col('name')} field="name" style={largura.name} />
      <AppColumn header={col('email')} body={(r: TriageRow) => r.email ?? '—'} style={largura.email} />
      <AppColumn
        header={col('situation')}
        body={(r: TriageRow) => <Situation r={r} clientName={clientName} canUpdate={canUpdateRegistration} onSetUpdate={onSetUpdate} />}
        style={largura.situation}
      />
      <AppColumn
        body={(r: TriageRow) => <RowActions actions={actions(r)} collapsed={actionsColumn.collapsed} />}
        style={stickyActionsColumn(actionsColumn.width)}
      />
    </AppDataTable>
  )
}
