import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar/Sidebar'
import { Header } from './Header/Header'
import { useUiStore } from '@app/providers/uiStore'

export function AppLayout() {
  const theme = useUiStore((s) => s.theme)

  // Aplica o tema no <html> — Tailwind dark: e (futuro) tema PrimeReact leem daqui.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
