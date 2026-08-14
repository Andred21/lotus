import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import { AppColumn, IdentityCell, AppButton, AppEmptyState, SearchableTableFrame } from '@shared/ui'
import type { StudentData } from '@shared/types/generated'

export function StudentsTable({
  students, loading, onView, actions, error, onRetry,
}: {
  students: StudentData[]
  loading: boolean
  onView: (s: StudentData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const table = useTableFilter(students, (s) => [s.name, s.rut])

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('student.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-user" title={t('student.empty')} description={t('student.emptyHint')} action={actions} />
      }
      footerCount={t('student.count', { count: table.rows.length })}
      actions={actions}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="name"
        header={t('student.name')}
        sortable
        body={(s: StudentData) => (
          <IdentityCell title={s.name} description={s.email} image={s.photo_url} />
        )}
      />
      <AppColumn
        header={t('common.rut')}
        body={(s: StudentData) => <span className="font-mono text-sm">{s.rut}</span>}
      />
      <AppColumn
        header={t('student.currentClient')}
        body={(s: StudentData) =>
          s.current_client_name ?? (
            <span style={{ color: 'var(--text-color-secondary)' }}>{t('student.noClient')}</span>
          )
        }
      />
      <AppColumn
        header={t('student.turmas')}
        body={(s: StudentData) => <span className="font-semibold">{s.enrollments_count}</span>}
      />
      <AppColumn
        body={(s: StudentData) => (
          <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(s)} />
        )}
        style={{ width: '4rem' }}
      />
    </SearchableTableFrame>
  )
}
