import { useTranslation } from 'react-i18next'
import { useUiStore } from '@shared/stores/uiStore'
import { AppButton } from '../AppButton'
import { LanguageMenu } from '../LanguageMenu'

/** Seletor de idioma + toggle de tema — o par tem UM dono. Consomem-no o
 * Header do shell e o LoginPage, que até 2026-08-12 mantinha uma cópia inline
 * do mesmo JSX: foi por ela que a correção UI-07 teve de escrever a chave
 * `common.toggleTheme` nas duas versões no mesmo commit.
 *
 * O `className` cai no próprio container flex, e é por ele que o chamador
 * posiciona o par sem embrulhá-lo noutro nó (o login ancora com
 * `absolute top-4 right-4`). Serve para posição e contexto do chamador, não
 * para mexer no `gap`/alinhamento interno: essas utilities já vivem no mesmo
 * seletor e quem decide o empate é a ordem do bundle do Tailwind, não a do
 * atributo — o espaçamento entre os dois controles é do componente, igual nos
 * dois usos. */
export function AppearanceControls({ className }: { className?: string }) {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      <LanguageMenu />
      <AppButton variant="brandIcon" onClick={toggleTheme} aria-label={t('common.toggleTheme')}>
        <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
      </AppButton>
    </div>
  )
}
