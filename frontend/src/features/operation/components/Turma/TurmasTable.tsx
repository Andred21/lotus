import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppDropdown, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns,
} from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import type { ArchivableRow } from '@shared/lib'
import { turmaDisplayStatus, type TurmaDisplayStatus } from '../../lib/turmaStatus'
import {
  TurmaClientCell, TurmaCodeCell, TurmaModalidadeCell, TurmaRedatoresCell, TurmaStatusCell,
} from './TurmaCells'
import { TurmaRowActions } from './TurmaRowActions'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

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
  // UI-07: o dropdown de estado só expunha o VALOR corrente ("Todos"), sem
  // nome nenhum — nem visual, nem para leitor de tela. `useId` (e não uma
  // string fixa) porque a tabela pode ganhar irmã na mesma tela um dia; um id
  // hardcoded duplicaria silenciosamente.
  const statusFilterId = useId()
  const archived = mode === 'archived'
  const table = useTableFilter(
    turmas,
    (turma) => [turma.course_name, turma.client_name, turma.quote_code, turma.budget_code],
    status === null ? undefined : (turma) => turmaDisplayStatus(turma) === status,
  )

  const statusOptions = [
    { label: t('operation.table.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`operation.status.${s}`), value: s })),
  ]

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('operation.table.search')}
      onClearFilter={() => setStatus(null)}
      filterSlot={
        // Par rótulo+dropdown, não `<div className="w-48">` solto: o rótulo é a
        // correção do UI-07 (o dropdown só expunha o VALOR corrente). `inputId`,
        // não `id` — o `AppDropdown` documenta por quê (`dropdown.cjs.js:1577`).
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={statusFilterId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('operation.table.status')}
          </label>
          <div className="w-48">
            <AppDropdown
              inputId={statusFilterId}
              value={status}
              options={statusOptions}
              optionValue="value"
              onChange={(e) => { setStatus(e.value as TurmaDisplayStatus | null); table.resetPage() }}
            />
          </div>
        </div>
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
      <AppColumn
        header={t('operation.table.code')}
        body={(turma: TurmaData) => <TurmaCodeCell turma={turma} />}
      />
      <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} />
      <AppColumn
        header={t('operation.table.client')}
        body={(turma: TurmaData) => <TurmaClientCell turma={turma} />}
      />
      <AppColumn
        header={t('operation.table.modality')}
        body={(turma: TurmaData) => <TurmaModalidadeCell turma={turma} />}
      />
      <AppColumn
        header={t('operation.table.redator')}
        body={(turma: TurmaData) => <TurmaRedatoresCell turma={turma} />}
      />
      <AppColumn
        header={t('operation.table.students')}
        body={(turma: TurmaData) => <span className="font-semibold">{turma.enrolled_count ?? 0}</span>}
      />
      <AppColumn
        header={t('operation.table.status')}
        body={(turma: TurmaData) => <TurmaStatusCell turma={turma} />}
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
        style={{ width: '8rem' }}
      />
    </SearchableTableFrame>
  )
}
