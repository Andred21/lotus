import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppTabView, AppTabPanel, AppTag, DetailHeader, AppCard } from '@shared/ui'
import { useTurmaDetail } from '../../hooks/useTurmaDetail'
import { turmaDisplayStatus, turmaStatusSeverity, turmaModalidadeTagProps } from '../../lib/turmaStatus'
import { TurmaConfigCard } from './TurmaConfigCard'
import { RedatorDesignation } from './RedatorDesignation'
import { EnrollmentSection } from '../Enrollment/EnrollmentSection'
import { TurmaDocuments } from '../Document/TurmaDocuments'
import { ConcludePanel } from '../Document/ConcludePanel'

export function TurmaDetailPage() {
  const { t } = useTranslation()
  const d = useTurmaDetail()
  const [tab, setTab] = useState(0)
  const [editingConfig, setEditingConfig] = useState(false)

  if (d.loading) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>
  if (!d.turma) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.detail.notFound')}</p>

  const turma = d.turma
  const status = turmaDisplayStatus(turma)

  return (
    <div>
      <DetailHeader
        back={{ label: t('operation.detail.back'), onClick: d.goBack }}
        title={turma.course_name ?? '—'}
        subtitle={
          <>
            {turma.client_name ?? '—'}
            {turma.budget_id != null && (
              <>
                {' · '}
                <button
                  type="button"
                  className="hover:underline"
                  style={{ color: 'var(--primary-color)' }}
                  onClick={() => d.goToBudget(turma.budget_id!)}
                >
                  {t('operation.detail.relatedTo', { budget: turma.budget_code ?? '—', quote: turma.quote_code ?? '—' })}
                </button>
              </>
            )}
          </>
        }
        tags={
          <>
            <AppTag value={t(`operation.status.${status}`)} severity={turmaStatusSeverity(status)} />
            <AppTag value={t(`operation.modality.${turma.modalidade}`)} {...turmaModalidadeTagProps(turma.modalidade)} />
          </>
        }
      />

      <AppCard>
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
            <EnrollmentSection turma={turma} />
          </AppTabPanel>
          <AppTabPanel header={t('operation.detail.tabs.redator')}>
            <RedatorDesignation turma={turma} />
          </AppTabPanel>
          <AppTabPanel header={t('operation.detail.tabs.docs')}>
            <TurmaDocuments turma={turma} />
          </AppTabPanel>
          <AppTabPanel header={t('operation.detail.tabs.conclusion')}>
            <ConcludePanel turma={turma} />
          </AppTabPanel>
        </AppTabView>
      </AppCard>
    </div>
  )
}
