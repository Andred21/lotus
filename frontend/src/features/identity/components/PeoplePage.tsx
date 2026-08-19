import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppCard } from '@shared/ui'
import { RedatoresTab } from './Redator/RedatoresTab'
import { StudentsTab } from './Student/StudentsTab'

/**
 * Casca de abas: cabeçalho, cartão e as duas abas. **Nenhum hook de dado.**
 *
 * O dado desceu para `RedatoresTab`/`StudentsTab` na D-04: chamado aqui, acima
 * das abas, ele ficava fora do alcance do `renderActiveOnly` do TabView e a
 * tela buscava as duas listas na montagem. Mesmo desenho da `CertificatesPage`.
 */
export function PeoplePage() {
  const { t } = useTranslation()

  return (
    <ModulePage title={t('module.personas.title')} description={t('module.personas.description')}>
      <AppCard>
        <ModuleTabs>
          <ModuleTab header={t('redator.tabRedatores')}>
            <RedatoresTab />
          </ModuleTab>

          <ModuleTab header={t('redator.tabStudents')}>
            <StudentsTab />
          </ModuleTab>
        </ModuleTabs>
      </AppCard>
    </ModulePage>
  )
}
