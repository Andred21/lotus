import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppTag, AppInputText, AppButton } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

export function ClientsTable({
  clients, loading, onView,
}: {
  clients: ClientData[]
  loading: boolean
  onView: (c: ClientData) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('client.searchPlaceholder')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <AppDataTable
        value={clients}
        loading={loading}
        globalFilter={filter}
        globalFilterFields={['legal_name', 'rut']}
        emptyMessage={t('client.empty')}
      >
        <AppColumn field="legal_name" header={t('client.legalName')} sortable />
        <AppColumn field="rut" header={t('common.rut')} />
        <AppColumn header={t('client.type')} body={(c: ClientData) => <AppTag value={t(`clientType.${c.type}`)} />} />
        <AppColumn header={t('client.commune')} body={(c: ClientData) => c.addresses[0]?.commune ?? '—'} />
        <AppColumn header={t('client.contacts')} body={(c: ClientData) => c.contacts.length} />
        <AppColumn
          body={(c: ClientData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <p className="text-sm text-slate-500">{t('client.count', { count: clients.length })}</p>
    </div>
  )
}
