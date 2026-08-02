import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import {
  AppDataTable, AppColumn, AppAvatar, AppTag, AppInputText, AppButton, AppCardToolbar, AppEmptyState,
} from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

export function ClientsTable({
  clients, loading, onView, actions, error, onRetry,
}: {
  clients: ClientData[]
  loading: boolean
  onView: (c: ClientData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(clients, (c) => [c.legal_name, c.rut])

  // Dois vazios distintos: sem dado convida a cadastrar; busca sem resultado
  // oferece limpar o filtro. Sugerir cadastro quando o problema é o termo manda
  // o usuário para o lugar errado.
  const empty = table.term === '' ? (
    <AppEmptyState icon="pi pi-building" title={t('client.empty')} description={t('client.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: table.filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={table.clear} />}
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
              value={table.filter}
              onChange={(e) => table.onFilterChange(e.target.value)}
            />
          </div>
        }
        end={error ? undefined : actions}
      />
      <AppDataTable
        value={table.rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={t('client.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
      >
        <AppColumn
          field="legal_name"
          header={t('client.legalName')}
          sortable
          body={(c: ClientData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={c.legal_name} image={c.photo_url} size="large" />
              <span className="font-medium">{c.legal_name}</span>
            </div>
          )}
        />
        <AppColumn header={t('common.rut')} body={(c: ClientData) => <span className="font-mono text-sm">{c.rut}</span>} />
        <AppColumn header={t('client.type')} body={(c: ClientData) => <AppTag value={t(`clientType.${c.type}`)} severity="secondary" />} />
        <AppColumn header={t('client.commune')} body={(c: ClientData) => c.addresses[0]?.commune ?? '—'} />
        <AppColumn header={t('client.contacts')} body={(c: ClientData) => <span className="font-semibold">{c.contacts.length}</span>} />
        <AppColumn
          body={(c: ClientData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
    </>
  )
}
