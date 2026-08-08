import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppCard } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { EmissionPanel } from './Emission/EmissionPanel'
import { HistorialTable } from './Historial/HistorialTable'

export function CertificatesPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const [tab, setTab] = useState(0)

  return (
    <ModulePage title={t('certificate.title')} description={t('certificate.subtitle')}>
      <AppCard>
        <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          {can('certification.certificate.issue') && (
            <ModuleTab header={t('certificate.tabEmision')}>
              <EmissionPanel />
            </ModuleTab>
          )}
          {can('certification.certificate.view') && (
            <ModuleTab header={t('certificate.tabHistorial')}>
              <HistorialTable />
            </ModuleTab>
          )}
        </ModuleTabs>
      </AppCard>
    </ModulePage>
  )
}
