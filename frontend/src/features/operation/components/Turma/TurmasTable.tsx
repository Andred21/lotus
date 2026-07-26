import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import {
  turmaDisplayStatus, turmaStatusSeverity, turmaModalidadeTagProps, type TurmaDisplayStatus,
} from '../../lib/turmaStatus'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

export function TurmasTable({ turmas, loading }: { turmas: TurmaData[]; loading: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = turmas.filter((turma) => {
    const matchesStatus = status === null || turmaDisplayStatus(turma) === status
    const matchesTerm =
      term === '' ||
      (turma.course_name ?? '').toLowerCase().includes(term) ||
      (turma.client_name ?? '').toLowerCase().includes(term) ||
      (turma.quote_code ?? '').toLowerCase().includes(term) ||
      (turma.budget_code ?? '').toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })

  const statusOptions = [
    { label: t('operation.table.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`operation.status.${s}`), value: s })),
  ]

  const filtering = term !== '' || status !== null

  const empty = filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      // Só cita o termo entre aspas quando existe termo; com apenas o filtro de
      // estado ativo a frase citaria aspas em branco.
      title={term === '' ? t('common.noResultsFiltered') : t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={
        <AppButton
          label={t('common.clearSearch')}
          icon="pi pi-times"
          text
          onClick={() => { setFilter(''); setStatus(null); setFirst(0) }}
        />
      }
    />
  ) : (
    // Sem ação: turma não se cria por botão, nasce de cotação aprovada.
    <AppEmptyState icon="pi pi-calendar" title={t('operation.table.empty')} description={t('operation.table.emptyHint')} />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <>
            <div className="min-w-64 flex-1">
              <AppInputText
                leftIcon="pi pi-search"
                placeholder={t('operation.table.search')}
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setFirst(0) }}
              />
            </div>
            <div className="w-48">
              <AppDropdown
                value={status}
                options={statusOptions}
                onChange={(e) => { setStatus(e.value as TurmaDisplayStatus | null); setFirst(0) }}
              />
            </div>
          </>
        }
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn
          header={t('operation.table.code')}
          body={(turma: TurmaData) => (
            <span className="font-mono text-sm" style={{ color: 'var(--primary-color)' }}>
              {turma.quote_code ?? '—'}
            </span>
          )}
        />
        <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} />
        <AppColumn header={t('operation.table.client')} body={(turma: TurmaData) => turma.client_name ?? '—'} />
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
          body={(turma: TurmaData) =>
            turma.redatores.length > 0 ? turma.redatores.map((r) => r.name).join(', ') : (
              <span style={{ color: 'var(--text-color-secondary)' }}>{t('operation.table.noRedator')}</span>
            )
          }
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
        <AppColumn
          body={(turma: TurmaData) => (
            <AppButton
              icon="pi pi-eye"
              text
              rounded
              aria-label={t('common.view')}
              onClick={() => navigate(`/operacion/turmas/${turma.id}`)}
            />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('operation.table.count', { count: rows.length })} />
    </>
  )
}
