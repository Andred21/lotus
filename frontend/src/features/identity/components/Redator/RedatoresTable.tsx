import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import { AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade, IDONEIDADE_SEVERITY, formatDateTime } from '@shared/lib'

export function RedatoresTable({
  redatores, loading, onView, actions, error, onRetry,
}: {
  redatores: RedatorData[]
  loading: boolean
  onView: (r: RedatorData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(redatores, (r) => [r.name, r.rut])

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('redator.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-users" title={t('redator.empty')} description={t('redator.emptyHint')} action={actions} />
      }
      footerCount={t('redator.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="name"
        header={t('redator.name')}
        sortable
        body={(r: RedatorData) => (
          <div className="flex items-center gap-3">
            <AppAvatar name={r.name} image={r.photo_url} size="large" />
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{r.email}</p>
            </div>
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
          return <AppTag value={t(`suitability.${k}`)} severity={IDONEIDADE_SEVERITY[k]} />
        }}
      />
      <AppColumn
        field="last_login"
        header={t('common.lastLogin')}
        sortable
        body={(r: RedatorData) => (r.last_login ? formatDateTime(new Date(r.last_login)) : '—')}
      />
      <AppColumn
        body={(r: RedatorData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(r)} />}
        style={{ width: '4rem' }}
      />
    </SearchableTableFrame>
  )
}
