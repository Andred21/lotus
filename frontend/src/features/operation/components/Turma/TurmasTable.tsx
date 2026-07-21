import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { turmaDisplayStatus, turmaStatusSeverity, type TurmaDisplayStatus } from '../../lib/turmaStatus'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

export function TurmasTable({ turmas, loading }: { turmas: TurmaData[]; loading: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)

  const rows = turmas.filter((turma) => {
    const matchesStatus = status === null || turmaDisplayStatus(turma) === status
    const term = filter.trim().toLowerCase()
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <AppInputText
            leftIcon="pi pi-search"
            placeholder={t('operation.table.search')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="w-48">
          <AppDropdown value={status} options={statusOptions} onChange={(e) => setStatus(e.value as TurmaDisplayStatus | null)} />
        </div>
      </div>

      <AppDataTable value={rows} loading={loading} emptyMessage={t('operation.table.empty')}>
        <AppColumn
          header={t('operation.table.code')}
          body={(turma: TurmaData) => <span className="font-mono text-sm text-sky-600">{turma.quote_code ?? '—'}</span>}
        />
        <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} />
        <AppColumn header={t('operation.table.client')} body={(turma: TurmaData) => turma.client_name ?? '—'} />
        <AppColumn
          header={t('operation.table.modality')}
          body={(turma: TurmaData) => <AppTag value={t(`operation.modality.${turma.modalidade}`)} />}
        />
        <AppColumn
          header={t('operation.table.redator')}
          body={(turma: TurmaData) =>
            turma.redatores.length > 0 ? turma.redatores.map((r) => r.name).join(', ') : (
              <span className="text-slate-400">{t('operation.table.noRedator')}</span>
            )
          }
        />
        <AppColumn header={t('operation.table.students')} body={(turma: TurmaData) => turma.enrolled_count ?? 0} />
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

      <p className="text-sm text-slate-500">{t('operation.table.count', { count: rows.length })}</p>
    </div>
  )
}
