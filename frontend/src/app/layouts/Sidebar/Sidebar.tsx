import { useUiStore } from '@app/stores/uiStore'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { usePermissions } from '@features/identity/hooks/usePermissions'
import { NAV_MODULES } from '@app/config/navigation'
import { APP_VERSION } from '@shared/config/brand'
import { SidebarItem } from './SidebarItem'
import logo from '@/assets/Logo.png'

/** Label da seção conforme a role predominante. */
function roleLabel(roles: string[]): string {
  if (roles.includes('superadmin') || roles.includes('admin')) return 'ADMINISTRADOR'
  if (roles.includes('redator')) return 'REDACTOR'
  return ''
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const roles = useSessionStore((s) => s.user?.roles ?? [])
  const { can } = usePermissions()

  const modules = NAV_MODULES.filter((m) => !m.permission || can(m.permission))

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} flex h-screen flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900`}
    >
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && <img src={logo} alt="Lotus" className="h-8 w-auto" />}
        <button
          onClick={toggle}
          aria-label="Alternar menu"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <i className={`pi ${collapsed ? 'pi-angle-right' : 'pi-angle-left'}`} />
        </button>
      </div>

      {!collapsed && (
        <p className="px-4 pb-2 text-xs font-semibold tracking-wider text-slate-400">
          {roleLabel(roles)}
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {modules.map((m) => (
          <SidebarItem key={m.key} module={m} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && <div className="px-4 py-3 text-xs text-slate-400">{APP_VERSION}</div>}
    </aside>
  )
}
