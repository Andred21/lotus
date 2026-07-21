import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppTabView, AppTabPanel, AppTag } from '@shared/ui'
import { useTurmaDetail } from '../../hooks/useTurmaDetail'
import { turmaDisplayStatus, turmaStatusSeverity } from '../../lib/turmaStatus'
import { TurmaConfigCard } from './TurmaConfigCard'
import { RedatorDesignation } from './RedatorDesignation'

export function TurmaDetailPage() {
  const { t } = useTranslation()
  const d = useTurmaDetail()
  const [tab, setTab] = useState(0)
  const [editingConfig, setEditingConfig] = useState(false)

  if (d.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
  if (!d.turma) return <p className="p-4 text-sm text-slate-500">{t('operation.detail.notFound')}</p>

  const turma = d.turma
  const status = turmaDisplayStatus(turma)

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={d.goBack}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('operation.detail.back')}
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{turma.course_name ?? '—'}</h2>
          <p className="text-sm text-slate-500">{turma.client_name ?? '—'}</p>
          {turma.budget_id != null && (
            <button
              type="button"
              className="mt-1 text-sm text-sky-600 hover:underline"
              onClick={() => d.goToBudget(turma.budget_id!)}
            >
              {t('operation.detail.relatedTo', { budget: turma.budget_code ?? '—', quote: turma.quote_code ?? '—' })}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AppTag value={t(`operation.status.${status}`)} severity={turmaStatusSeverity(status)} />
          <AppTag value={t(`operation.modality.${turma.modalidade}`)} />
        </div>
      </header>

      <AppTabView activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
        <AppTabPanel header={t('operation.detail.tabs.config')}>
          <TurmaConfigCard
            mode={editingConfig ? 'edit' : 'view'}
            turma={turma}
            onEdit={() => setEditingConfig(true)}
            onCancel={() => setEditingConfig(false)}
            onSaved={() => setEditingConfig(false)}
          />
        </AppTabPanel>
        <AppTabPanel header={t('operation.detail.tabs.students')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </AppTabPanel>
        <AppTabPanel header={t('operation.detail.tabs.redator')}>
          <RedatorDesignation turma={turma} />
        </AppTabPanel>
        <AppTabPanel header={t('operation.detail.tabs.docs')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </AppTabPanel>
        <AppTabPanel header={t('operation.detail.tabs.conclusion')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </AppTabPanel>
      </AppTabView>
    </div>
  )
}
