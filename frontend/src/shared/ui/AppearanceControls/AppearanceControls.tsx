import { useTranslation } from 'react-i18next'
import { useUiStore } from '@shared/stores/uiStore'
import { AppButton } from '../AppButton'
import { LanguageMenu } from '../LanguageMenu'

/** Seletor de idioma + toggle de tema. Repetido no Header e no LoginPage;
 * a duplicação do bloco JSX vivia nos dois.
 *
 * `onNavy` troca o par de variantes de uma vez: sobre a navy fixa do shell o
 * visual de marca vira caixa branca colada no fundo (D-P13). É um booleano, e
 * não duas props de variante, para os dois controles não saírem de superfícies
 * diferentes por descuido do call site. */
export function AppearanceControls({
  className,
  onNavy = false,
}: {
  className?: string
  onNavy?: boolean
}) {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className ?? ''}`}>
      <LanguageMenu variant={onNavy ? 'onNavyLabel' : 'brandLabel'} />
      <AppButton
        variant={onNavy ? 'onNavyIcon' : 'brandIcon'}
        onClick={toggleTheme}
        aria-label={t('common.toggleTheme')}
      >
        <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
      </AppButton>
    </div>
  )
}
