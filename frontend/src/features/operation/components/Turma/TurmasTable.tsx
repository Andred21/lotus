import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppDropdown, AppTag, IdentityCell,
  AppEmptyState, ArchiveSwitch, SearchableTableFrame,
} from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import {
  turmaDisplayStatus, turmaStatusSeverity, turmaModalidadeTagProps, type TurmaDisplayStatus,
} from '../../lib/turmaStatus'
import { TurmaRowActions } from './TurmaRowActions'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do rastreio
 * vêm preenchidas pelo achatamento do `useArchivedPage`. Molde: `ClientRow`. */
export type TurmaRow = TurmaData & {
  archived_at?: string
  archived_by?: string | null
}

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
        <div className="w-48">
          <AppDropdown
            value={status}
            options={statusOptions}
            optionValue="value"
            onChange={(e) => { setStatus(e.value as TurmaDisplayStatus | null); table.resetPage() }}
          />
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
        body={(turma: TurmaData) => (
          <span className="font-bold text-sm" style={{ color: 'var(--primary-color)' }}>
            {turma.quote_code ?? '—'}
          </span>
        )}
      />
      <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} />
      <AppColumn
        header={t('operation.table.client')}
        body={(turma: TurmaData) => (
          <IdentityCell
            title={turma.client_name ?? '—'}
            description={turma.client_rut}
            image={turma.client_photo_url}
          />
        )}
      />
      <AppColumn
        header={t('operation.table.modality')}
        body={(turma: TurmaData) => (
          <AppTag
            value={t(`operation.modality.${turma.modalidade}`)}
            {...turmaModalidadeTagProps(turma.modalidade)}
          />
        )}
      />
      <AppColumn
        header={t('operation.table.redator')}
        body={(turma: TurmaData) => {
          const [primeiro, ...resto] = turma.redatores

          if (primeiro === undefined)
            return <span style={{ color: 'var(--text-color-secondary)' }}>{t('operation.table.noRedator')}</span>

          /* Primeiro + contador, não N células empilhadas: a altura da linha
           * tem de ser constante na tabela inteira. O `+N` é numeral puro,
           * então não abre chave de i18n; os nomes restantes vão no `title`,
           * que é dado e não copy. */
          return (
            <div className="flex items-center gap-2">
              <IdentityCell title={primeiro.name} description={primeiro.email} image={primeiro.photo_url} />
              {resto.length > 0 && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-color-secondary)' }}
                  title={resto.map((r) => r.name).join(', ')}
                >
                  +{resto.length}
                </span>
              )}
            </div>
          )
        }}
      />
      <AppColumn
        header={t('operation.table.students')}
        body={(turma: TurmaData) => <span className="font-semibold">{turma.enrolled_count ?? 0}</span>}
      />
      <AppColumn
        header={t('operation.table.status')}
        body={(turma: TurmaData) => {
          const s = turmaDisplayStatus(turma)
          return <AppTag value={t(`operation.status.${s}`)} severity={turmaStatusSeverity(s)} />
        }}
      />
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(turma: TurmaRow) =>
            turma.archived_at ? new Date(turma.archived_at).toLocaleDateString() : '—'
          }
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(turma: TurmaRow) => turma.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
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
