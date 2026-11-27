import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppCard } from '@shared/ui'
import { usePermissions, useUrlTab } from '@shared/hooks'
import { EmissionPanel } from './Emission/EmissionPanel'
import { HistorialTable } from './Historial/HistorialTable'

const TABS = ['emision', 'historial'] as const

export function CertificatesPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canIssue = can('certification.certificate.issue')
  const canView = can('certification.certificate.view')
  // Sem `issue`, `?tab=emision` cai no Historial (a primeira visível), em vez
  // de apontar para o slot vazio. A ordem do JSX abaixo segue `TABS`.
  const { index, setTab } = useUrlTab(TABS, TABS.filter((name) => (name === 'emision' ? canIssue : canView)))

  return (
    <ModulePage title={t('certificate.title')} description={t('certificate.subtitle')}>
      <AppCard>
        <ModuleTabs activeIndex={index} onTabChange={(e) => setTab(e.index)}>
          {canIssue && (
            <ModuleTab header={t('certificate.tabEmision')}>
              <EmissionPanel />
            </ModuleTab>
          )}
          {canView && (
            <ModuleTab header={t('certificate.tabHistorial')}>
              <HistorialTable />
            </ModuleTab>
          )}
        </ModuleTabs>
      </AppCard>
    </ModulePage>
  )
}
