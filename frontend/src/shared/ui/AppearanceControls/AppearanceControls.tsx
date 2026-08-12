import { useTranslation } from 'react-i18next'
import { useUiStore } from '@shared/stores/uiStore'
import { AppButton } from '../AppButton'
import { LanguageMenu } from '../LanguageMenu'

/** Seletor de idioma + toggle de tema. Repetido no Header e no LoginPage;
 * a duplicação do bloco JSX vivia nos dois. */
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
