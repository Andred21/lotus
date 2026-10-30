import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSubNav } from '@shared/ui'
import { CertificateSettingsPanel } from '@features/certification/components/Settings/CertificateSettingsPanel'

/**
 * Conteúdo da aba Configuración: navegação de submódulos à esquerda, o submódulo
 * escolhido à direita. Mora em `app/` porque junta uma feature (Certification)
 * à página de outra (Identity), e feature não importa feature (lei 6). Submódulo
 * novo entra como mais um item e mais um ramo do `activeKey`.
 */
export function ConfiguracionTab() {
  const { t } = useTranslation()
  const [activeKey, setActiveKey] = useState('certificados')

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <AppSubNav
        items={[{ key: 'certificados', label: t('admin.configuracion.certificados') }]}
        activeKey={activeKey}
        onSelect={setActiveKey}
        ariaLabel={t('admin.configuracion.navLabel')}
      />
      <div>{activeKey === 'certificados' && <CertificateSettingsPanel />}</div>
    </div>
  )
}
