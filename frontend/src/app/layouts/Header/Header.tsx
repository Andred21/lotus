import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppDivider, AppHeader, AppearanceControls, Clock } from '@shared/ui'
import { NAV_MODULES } from '@shared/config/navigation'
import { UserMenu } from './UserMenu'

const EXTRA_TITLES: Record<string, string> = { '/perfil': 'userMenu.profile' }

/** Chave i18n do título conforme a rota. */
function pageTitleKey(pathname: string): string {
  return NAV_MODULES.find((m) => m.path === pathname)?.labelKey ?? EXTRA_TITLES[pathname] ?? 'nav.dashboard'
}

export function Header() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <AppHeader className="border-slate-400 bg-gray-200 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {t(pageTitleKey(pathname))}
      </h1>

      <div className="flex items-center gap-4">
        <AppearanceControls />
        <AppDivider layout="vertical" className="mx-0! h-6" />
        <Clock className="hidden md:block dark:text-slate-200" />
        <UserMenu />
      </div>
    </AppHeader>
  )
}
