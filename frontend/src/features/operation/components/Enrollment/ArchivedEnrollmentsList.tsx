import { useTranslation } from 'react-i18next'
import { usePermissions, useTableFilter } from '@shared/hooks'
import { AppButton, AppColumn, AppDataTable, AppEmptyState, IdentityCell } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'

/** Molde `ClientRow`: a forma achatada pelo `useArchivedPage`. */
export type ArchivedEnrollmentRow = EnrollmentData & {
  archived_at?: string
  archived_by?: string | null
}

/**
 * Matrículas arquivadas da turma. Componente próprio, e não um modo da
 * `EnrollmentTable`: a linha ativa carrega registrar resultado, remover e o badge
 * de estado acadêmico — nada disso aplicável a quem está fora da turma. A
 * `EnrollmentTable` já tem 150 linhas de ramificação por permissão; um segundo
 * modo por dentro dela dobraria isso.
 *
 * `AppDataTable` com `error`/`onRetry`/`footerCount`/`emptyMessage` é a mesma
 * composição da irmã ativa — inclusive o `useTableFilter` sem seletor, que aqui
 * serve só à paginação (a aba é sem busca, decisão do protótipo).
 */
export function ArchivedEnrollmentsList({
  enrollments,
  loading,
  error,
  onRetry,
  onRestore,
  restoring,
}: {
  enrollments: ArchivedEnrollmentRow[]
  loading: boolean
  error?: { detail?: string | null } | null
  onRetry: () => void | Promise<unknown>
  onRestore: (id: number) => void
  /** Restore em voo — trava os botões (Q-2). */
  restoring: boolean
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const table = useTableFilter(enrollments)

  return (
    <AppDataTable
      value={table.rows}
      loading={loading}
      error={error}
      onRetry={onRetry}
      first={table.first}
      onPage={table.onPage}
      footerCount={t('operation.enrollment.footerCount', { count: table.rows.length })}
      emptyMessage={
        <AppEmptyState icon="pi pi-inbox" title={t('archive.empty')} description={t('archive.emptyHint')} />
      }
    >
      <AppColumn
        header={t('operation.enrollment.table.name')}
        body={(e: ArchivedEnrollmentRow) => (
          <IdentityCell title={e.name} description={e.email} image={e.photo_url} />
        )}
      />
      <AppColumn header={t('operation.enrollment.table.rut')} field="rut" />
      <AppColumn
        field="archived_at"
        header={t('archive.archivedAt')}
        body={(e: ArchivedEnrollmentRow) =>
          e.archived_at ? new Date(e.archived_at).toLocaleDateString() : '—'
        }
      />
      <AppColumn
        field="archived_by"
        header={t('archive.archivedBy')}
        body={(e: ArchivedEnrollmentRow) => e.archived_by ?? t('archive.unknownAuthor')}
      />
      <AppColumn
        body={(e: ArchivedEnrollmentRow) =>
          can('operation.enrollment.restore') ? (
            <AppButton
              label={t('archive.restoreAction')}
              icon="pi pi-undo"
              text
              size="small"
              disabled={restoring}
              onClick={() => e.id != null && onRestore(e.id)}
            />
          ) : null
        }
        style={{ width: '8rem' }}
      />
    </AppDataTable>
  )
}
