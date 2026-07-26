import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppInputText, AppButton, AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

export function ClientsTable({
  clients, loading, onView, actions,
}: {
  clients: ClientData[]
  loading: boolean
  onView: (c: ClientData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? clients
    : clients.filter(
        (c) => c.legal_name.toLowerCase().includes(term) || c.rut.toLowerCase().includes(term),
      )

  // Dois vazios distintos: sem dado convida a cadastrar; busca sem resultado
  // oferece limpar o filtro. Sugerir cadastro quando o problema é o termo manda
  // o usuário para o lugar errado.
  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-building" title={t('client.empty')} description={t('client.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={() => setFilter('')} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('client.searchPlaceholder')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable value={rows} loading={loading} emptyMessage={empty} paginator={rows.length > 10}>
        <AppColumn field="legal_name" header={t('client.legalName')} sortable />
        <AppColumn header={t('common.rut')} body={(c: ClientData) => <span className="font-mono text-sm">{c.rut}</span>} />
        <AppColumn header={t('client.type')} body={(c: ClientData) => <AppTag value={t(`clientType.${c.type}`)} severity="secondary" />} />
        <AppColumn header={t('client.commune')} body={(c: ClientData) => c.addresses[0]?.commune ?? '—'} />
        <AppColumn header={t('client.contacts')} body={(c: ClientData) => <span className="font-semibold">{c.contacts.length}</span>} />
        <AppColumn
          body={(c: ClientData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('client.count', { count: rows.length })} />
    </>
  )
}
