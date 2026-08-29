import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ServerTable } from '@shared/hooks'
import { AppColumn, IdentityCell, AppButton, AppEmptyState, SearchableTableFrame, stickyActionsColumn } from '@shared/ui'
import type { StudentData } from '@shared/types/generated'
import { studentWidths } from './studentColumns'

export function StudentsTable({
  table, onView, actions,
}: {
  /** Pronto do `useStudentsPage`: busca, página e sort vivem no servidor. A
   * tabela não instancia `useTableFilter` — filtrar no cliente uma página
   * seria filtrar 10 de 5.000. */
  table: ServerTable<StudentData>
  onView: (s: StudentData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const largura = studentWidths()

  return (
    <SearchableTableFrame
      table={table}
      totalRecords={table.totalRecords}
      sortField={table.sortField}
      sortOrder={table.sortOrder}
      onSort={table.onSort}
      searchPlaceholder={t('student.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-user" title={t('student.empty')} description={t('student.emptyHint')} action={actions} />
      }
      footerCount={t('student.count', { count: table.totalRecords })}
      actions={actions}
      loading={table.loading}
      error={table.error}
      onRetry={table.refetch}
    >
      <AppColumn
        field="name"
        header={t('student.name')}
        sortable
        style={largura.name}
        body={(s: StudentData) => (
          <IdentityCell title={s.name} description={s.email} image={s.photo_url} />
        )}
      />
      <AppColumn
        field="rut"
        header={t('common.rut')}
        sortable
        style={largura.rut}
        body={(s: StudentData) => <span className="font-mono text-sm">{s.rut}</span>}
      />
      <AppColumn
        header={t('student.currentClient')}
        style={largura.currentClient}
        body={(s: StudentData) =>
          s.current_client_name ?? (
            <span style={{ color: 'var(--text-color-secondary)' }}>{t('student.noClient')}</span>
          )
        }
      />
      <AppColumn
        header={t('student.turmas')}
        style={largura.turmas}
        body={(s: StudentData) => <span className="font-semibold">{s.enrollments_count}</span>}
      />
      <AppColumn
        body={(s: StudentData) => (
          <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(s)} />
        )}
        style={stickyActionsColumn('6rem')}
      />
    </SearchableTableFrame>
  )
}
