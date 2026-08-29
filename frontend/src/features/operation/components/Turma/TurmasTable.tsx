import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns, stickyActionsColumn,
} from '@shared/ui'
import type { ArchiveMode, ServerTable } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import type { TurmaDisplayStatus } from '../../lib/turmaStatus'
import type { TurmaRow } from '../../hooks/useTurmasPage'
import {
  TurmaClientCell, TurmaCodeCell, TurmaModalidadeCell, TurmaRedatoresCell, TurmaStatusCell,
} from './TurmaCells'
import { turmaWidths } from './turmaColumns'
import { TurmaRowActions } from './TurmaRowActions'
import { TurmaStatusFilter } from './TurmaStatusFilter'

export type { TurmaRow }

export function TurmasTable({
  table, status, onStatusChange,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  /** Pronto do `useTurmasPage`: busca, filtro de estado, página e sort no servidor. */
  table: ServerTable<TurmaRow>
  status: TurmaDisplayStatus | null
  onStatusChange: (status: TurmaDisplayStatus | null) => void
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (turma: TurmaData) => void
  onRestore: (turma: TurmaData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const archived = mode === 'archived'
  const largura = turmaWidths(archived)

  return (
    <SearchableTableFrame
      table={table}
      totalRecords={table.totalRecords}
      sortField={table.sortField}
      sortOrder={table.sortOrder}
      onSort={table.onSort}
      searchPlaceholder={t('operation.table.search')}
      onClearFilter={() => onStatusChange(null)}
      filterSlot={<TurmaStatusFilter value={status} onChange={onStatusChange} />}
      emptyState={
        // Sem ação em nenhuma das duas visões: turma não se cria por botão,
        // nasce de cotação aprovada.
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-calendar'}
          title={archived ? t('archive.empty') : t('operation.table.empty')}
          description={archived ? t('archive.emptyHint') : t('operation.table.emptyHint')}
        />
      }
      footerCount={t('operation.table.count', { count: table.totalRecords })}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={table.loading}
      error={table.error}
      onRetry={table.refetch}
    >
      {/* Largura das colunas: `turmaWidths` (o porquê e as três medições estão
        * lá). Em PORCENTAGEM, normalizada por `tableWidths` para o orçamento —
        * coluna nova aqui entra declarando a classe dela, e a repartição refaz
        * a soma sozinha; não há mais aritmética à mão a acertar.
        * `whitespace-nowrap` é só do código — identificador atômico. */}
      {/* Sem `sortable`: `field="created_at" sortable` sob o cabeçalho CÓDIGO
        * ordenava a lista pela data de criação da turma enquanto a célula
        * mostra `Scap {budget_id} - Cot {seq}` — ordem visível diferente da
        * ordem pedida (Q-4 do review de 2026-08-29). A allowlist do
        * `TurmaQueryBuilder` é `created_at`/`start_date`/`end_date`, e nenhuma
        * das colunas desta tabela mostra data; coluna de data que um dia entre
        * aqui já nasce com `sortable`. O `sortField`/`onSort` seguem ligados na
        * moldura — é o contrato do `useServerTable`, não fiação desta coluna. */}
      <AppColumn
        header={t('operation.table.code')}
        body={(turma: TurmaData) => <TurmaCodeCell turma={turma} />}
        className="whitespace-nowrap"
        style={largura.code}
      />
      <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} style={largura.course} />
      <AppColumn
        header={t('operation.table.client')}
        body={(turma: TurmaData) => <TurmaClientCell turma={turma} />}
        style={largura.client}
      />
      <AppColumn
        header={t('operation.table.modality')}
        body={(turma: TurmaData) => <TurmaModalidadeCell turma={turma} />}
        style={largura.modality}
      />
      <AppColumn
        header={t('operation.table.redator')}
        body={(turma: TurmaData) => <TurmaRedatoresCell turma={turma} />}
        style={largura.redator}
      />
      <AppColumn
        header={t('operation.table.students')}
        body={(turma: TurmaData) => <span className="font-semibold">{turma.enrolled_count ?? 0}</span>}
        style={largura.students}
      />
      <AppColumn
        header={t('operation.table.status')}
        body={(turma: TurmaData) => <TurmaStatusCell turma={turma} />}
        style={largura.status}
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
        style={stickyActionsColumn(archived ? '10rem' : '9rem')}
      />
    </SearchableTableFrame>
  )
}
