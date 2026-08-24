import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns, stickyActionsColumn,
} from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import type { ArchivableRow } from '@shared/lib'
import { turmaDisplayStatus, type TurmaDisplayStatus } from '../../lib/turmaStatus'
import {
  TurmaClientCell, TurmaCodeCell, TurmaModalidadeCell, TurmaRedatoresCell, TurmaStatusCell,
} from './TurmaCells'
import { TURMA_COLUMN } from './turmaColumns'
import { TurmaRowActions } from './TurmaRowActions'
import { TurmaStatusFilter } from './TurmaStatusFilter'

/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type TurmaRow = ArchivableRow<TurmaData>

export function TurmasTable({
  turmas, loading, error, onRetry,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  turmas: TurmaRow[]
  loading: boolean
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (turma: TurmaData) => void
  onRestore: (turma: TurmaData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  error?: { detail?: string | null } | null
  /** A promise é o que mantém o Reintentar em `loading` (Q-14); `() => void`
   * compilaria e faria esta camada mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)
  const archived = mode === 'archived'
  const table = useTableFilter(
    turmas,
    (turma) => [turma.course_name, turma.client_name, turma.quote_code, turma.budget_code],
    status === null ? undefined : (turma) => turmaDisplayStatus(turma) === status,
  )

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('operation.table.search')}
      onClearFilter={() => setStatus(null)}
      filterSlot={
        <TurmaStatusFilter
          value={status}
          onChange={(novo) => { setStatus(novo); table.resetPage() }}
        />
      }
      emptyState={
        // Sem ação em nenhuma das duas visões: turma não se cria por botão,
        // nasce de cotação aprovada.
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-calendar'}
          title={archived ? t('archive.empty') : t('operation.table.empty')}
          description={archived ? t('archive.emptyHint') : t('operation.table.emptyHint')}
        />
      }
      footerCount={t('operation.table.count', { count: table.rows.length })}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {/* Largura das colunas: `TURMA_COLUMN` (o porquê e as três medições estão
        * lá). Em PORCENTAGEM, somando 91% mais a coluna de ações — coluna nova
        * aqui entra tirando pontos das irmãs, não somando por cima, senão a
        * tabela passa a transbordar em toda tela. `whitespace-nowrap` é só do
        * código — identificador atômico. */}
      <AppColumn
        header={t('operation.table.code')}
        body={(turma: TurmaData) => <TurmaCodeCell turma={turma} />}
        className="whitespace-nowrap"
        style={TURMA_COLUMN.code}
      />
      <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} style={TURMA_COLUMN.course} />
      <AppColumn
        header={t('operation.table.client')}
        body={(turma: TurmaData) => <TurmaClientCell turma={turma} />}
        style={TURMA_COLUMN.identity}
      />
      <AppColumn
        header={t('operation.table.modality')}
        body={(turma: TurmaData) => <TurmaModalidadeCell turma={turma} />}
        style={TURMA_COLUMN.modality}
      />
      <AppColumn
        header={t('operation.table.redator')}
        body={(turma: TurmaData) => <TurmaRedatoresCell turma={turma} />}
        style={TURMA_COLUMN.identity}
      />
      <AppColumn
        header={t('operation.table.students')}
        body={(turma: TurmaData) => <span className="font-semibold">{turma.enrolled_count ?? 0}</span>}
        style={TURMA_COLUMN.students}
      />
      <AppColumn
        header={t('operation.table.status')}
        body={(turma: TurmaData) => <TurmaStatusCell turma={turma} />}
        style={TURMA_COLUMN.status}
      />
      {archived && archivedColumns(t)}
      <AppColumn
        body={(turma: TurmaRow) => (
          <TurmaRowActions
            turma={turma}
            archived={archived}
            busy={busy}
            onView={(x) => navigate(`/operacion/turmas/${x.id}`)}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        )}
        style={stickyActionsColumn('8rem')}
      />
    </SearchableTableFrame>
  )
}
