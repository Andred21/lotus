import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppButton, AppDivider } from '@shared/ui'
import { useUiStore } from '@app/stores/uiStore'
import { NAV_MODULES } from '@/shared/config/navigation'
import { UserMenu } from './UserMenu'

const EXTRA_TITLES: Record<string, string> = { '/perfil': 'Mi perfil' }

function pageTitle(pathname: string): string {
  return NAV_MODULES.find((m) => m.path === pathname)?.label ?? EXTRA_TITLES[pathname] ?? 'Dashboard'
}

export function Header() {

  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const { pathname } = useLocation()

  // Relógio ao vivo (HH:MM) — atualiza a cada minuto.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-slate-400 bg-gray-200 px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
      
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {pageTitle(pathname)}
      </h1>

      <div className="flex items-center gap-4">
        {/* Idioma — stub visual (i18n = ADR-15, lib ainda não decidida) */}
        <AppButton
          className="flex items-center px-3 py-2.5 gap-1 text-sm text-[#25A5E4] 
          bg-white border-[#25A5E4] border-2 ring-0 
           dark:border-2 dark:border-white  dark:bg-[#25A5E4]
            hover:text-slate-700 dark:hover:text-slate-300 dark:text-white"
          title="Idioma (em breve)"
        >
          <i className="pi pi-globe" /> EN
        </AppButton>

        <AppButton
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className=" text-[#25A5E4] 
          bg-white border-[#25A5E4] border-2 ring-0 
           dark:border-2 dark:border-white  dark:bg-[#25A5E4]
            hover:text-slate-700 dark:hover:text-slate-300 dark:text-white "
        >
          <i className={` text-md pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
        </AppButton>

        <AppDivider layout="vertical" className="mx-0! h-6"  />

        <div className="hidden text-right text-xs leading-tight text-slate-500 md:block">
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p>{now.toLocaleDateString('es-CL')}</p>
        </div>

        <UserMenu />

      </div>
    </header>
  )
}
