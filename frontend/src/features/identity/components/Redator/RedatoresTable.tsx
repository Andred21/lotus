import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppInputText, AppButton,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade } from '../../lib/redatorStatus'

const IDON_SEVERITY = { idoneo: 'success', por_vencer: 'warning', no_idoneo: 'danger' } as const

export function RedatoresTable({
  redatores, loading, onView, actions,
}: {
  redatores: RedatorData[]
  loading: boolean
  onView: (r: RedatorData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? redatores
    : redatores.filter(
        (r) => r.name.toLowerCase().includes(term) || r.rut.toLowerCase().includes(term),
      )

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-users" title={t('redator.empty')} description={t('redator.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={() => handleFilterChange('')} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('redator.searchPlaceholder')}
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn
          field="name"
          header={t('redator.name')}
          sortable
          body={(r: RedatorData) => (
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{r.email}</p>
            </div>
          )}
        />
        <AppColumn
          header={t('common.rut')}
          body={(r: RedatorData) => <span className="font-mono text-sm">{r.rut}</span>}
        />
        <AppColumn
          header={t('redator.enabledCourses')}
          body={(r: RedatorData) => <span className="font-semibold">{r.course_ids.length}</span>}
        />
        <AppColumn
          header={t('redator.suitability')}
          body={(r: RedatorData) => {
            const k = idoneidade(r)
            return <AppTag value={t(`suitability.${k}`)} severity={IDON_SEVERITY[k]} />
          }}
        />
        <AppColumn
          body={(r: RedatorData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(r)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('redator.count', { count: rows.length })} />
    </>
  )
}
