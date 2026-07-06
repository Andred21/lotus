import { useLocation } from 'react-router-dom'
import { AppButton, AppDivider, AppHeader, Clock, LanguageMenu } from '@shared/ui'
import { useUiStore } from '@app/providers/uiStore'
import { NAV_MODULES } from '@shared/config/navigation'
import { UserMenu } from './UserMenu'

const EXTRA_TITLES: Record<string, string> = { '/perfil': 'Mi perfil' }

function pageTitle(pathname: string): string {
  return NAV_MODULES.find((m) => m.path === pathname)?.label ?? EXTRA_TITLES[pathname] ?? 'Dashboard'
}

export function Header() {

  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const { pathname } = useLocation()

  return (

    <AppHeader className="border-slate-400 bg-gray-200 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {pageTitle(pathname)}
      </h1>

      <div className="flex items-center gap-4">
        <LanguageMenu />

        <AppButton variant="brandIcon" onClick={toggleTheme} aria-label="Alternar tema">
          <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
        </AppButton>

        <AppDivider layout="vertical" className="mx-0! h-6" />

        <Clock className="hidden md:block dark:text-slate-200 " />

        <UserMenu />
      </div>
    </AppHeader>
  )
}
