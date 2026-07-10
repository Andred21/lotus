import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppTag, AppInputText, AppButton } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade } from '../../lib/redatorStatus'

const IDON_SEVERITY = { idoneo: 'success', por_vencer: 'warning', no_idoneo: 'danger' } as const

export function RedatoresTable({
  redatores, loading, onView,
}: {
  redatores: RedatorData[]
  loading: boolean
  onView: (r: RedatorData) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText leftIcon="pi pi-search" placeholder={t('redator.searchPlaceholder')} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <AppDataTable value={redatores} loading={loading} globalFilter={filter} globalFilterFields={['name', 'rut']} emptyMessage={t('redator.empty')}>
        <AppColumn field="name" header={t('redator.name')} sortable body={(r: RedatorData) => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-slate-500">{r.email}</p>
          </div>
        )} />
        <AppColumn field="rut" header={t('common.rut')} />
        <AppColumn header={t('redator.enabledCourses')} body={(r: RedatorData) => r.course_ids.length} />
        <AppColumn header={t('redator.suitability')} body={(r: RedatorData) => {
          const k = idoneidade(r)
          return <AppTag value={t(`suitability.${k}`)} severity={IDON_SEVERITY[k]} />
        }} />
        <AppColumn body={(r: RedatorData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(r)} />} style={{ width: '4rem' }} />
      </AppDataTable>
      <p className="text-sm text-slate-500">{t('redator.count', { count: redatores.length })}</p>
    </div>
  )
}
