import { useTranslation } from 'react-i18next'
import { usePermissions, useTableFilter } from '@shared/hooks'
import {
  AppButton, AppColumn, AppDataTable, AppEmptyState, IdentityCell, archivedColumns,
} from '@shared/ui'
import type { ArchivableRow } from '@shared/lib'
import type { EnrollmentData } from '@shared/types/generated'

/** A forma achatada pelo `useArchivedPage`. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type ArchivedEnrollmentRow = ArchivableRow<EnrollmentData>

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
      {/* Sem guarda de modo: esta lista SÓ existe no modo arquivado, então as duas
          colunas são fixas. */}
      {archivedColumns(t)}
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
