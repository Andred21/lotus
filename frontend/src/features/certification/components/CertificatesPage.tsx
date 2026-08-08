import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppCard } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { EmissionPanel } from './Emission/EmissionPanel'

/** Historial (Task 8) ainda é stub — a aba já existe (gate por `can()`), o
 * conteúdo real entra quando `HistorialTable` nascer. */
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
              <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t('placeholder.module')}
              </p>
            </ModuleTab>
          )}
        </ModuleTabs>
      </AppCard>
    </ModulePage>
  )
}
