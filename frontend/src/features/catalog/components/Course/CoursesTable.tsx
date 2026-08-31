import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, ArchiveSwitch, AppEmptyState, SearchableTableFrame, archivedColumns, stickyActionsColumn, technicalDataClass } from '@shared/ui'
import type { ArchivableRow } from '@shared/lib'
import type { CourseData } from '@shared/types/generated'
import { CourseRowActions } from './CourseRowActions'
import { courseWidths } from './courseColumns'

/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type CourseRow = ArchivableRow<CourseData>

export function CoursesTable({
  courses, loading, onView, actions, error, onRetry, mode, onModeChange, onArchive, onRestore, busy,
}: {
  courses: CourseRow[]
  loading: boolean
  onView: (c: CourseData) => void
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (c: CourseData) => void
  onRestore: (c: CourseData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const archived = mode === 'archived'
  const largura = courseWidths(archived)
  const table = useTableFilter(courses, (c) => [c.name, c.technical_name])

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('course.searchPlaceholder')}
      emptyState={
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-book'}
          title={archived ? t('archive.empty') : t('course.empty')}
          description={archived ? t('archive.emptyHint') : t('course.emptyHint')}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t('course.count', { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="name"
        header={t('course.name')}
        sortable
        style={largura.name}
        body={(c: CourseData) => (
          <div className="flex items-center gap-3">
            <i
              className="pi pi-book"
              style={{ color: 'var(--text-color-secondary)', fontSize: '1.25rem' }}
            />
            <span className="font-medium">{c.name}</span>
          </div>
        )}
      />
      <AppColumn
        header={t('course.technicalName')}
        style={largura.technicalName}
        body={(c: CourseData) => c.technical_name ?? '—'}
      />
      <AppColumn
        header={t('course.workloadHours')}
        style={largura.workload}
        body={(c: CourseData) => (
          <span className={`${technicalDataClass} font-semibold`}>{c.workload_hours}</span>
        )}
      />
      <AppColumn
        header={t('course.redatorCount')}
        style={largura.redatorCount}
        body={(c: CourseData) => (
          <span className={`${technicalDataClass} font-semibold`}>{c.redator_ids.length}</span>
        )}
      />
      {archived && archivedColumns(t)}
      <AppColumn
        body={(c: CourseRow) => (
          <CourseRowActions
            course={c}
            archived={archived}
            busy={busy}
            onView={onView}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        )}
        style={stickyActionsColumn(archived ? '10rem' : '9rem')}
      />
    </SearchableTableFrame>
  )
}
