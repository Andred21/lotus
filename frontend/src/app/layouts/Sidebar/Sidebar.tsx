import { useTranslation } from 'react-i18next'
import { useUiStore } from '@shared/stores/uiStore'
import { usePermissions } from '@shared/hooks/usePermissions'
import { NAV_MODULES } from '@shared/config/navigation'
import { APP_VERSION } from '@shared/config/brand'
import { AppButton, AppSidebar } from '@shared/ui'
import { roleSectionLabel } from '@shared/lib'
import { SidebarItem } from './SidebarItem'
import logo from '@/assets/Logo.png'

export function Sidebar() {

  const { t } = useTranslation()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const { can, roles } = usePermissions()

  const modules = NAV_MODULES.filter((m) => !m.permission || can(m.permission))
  const roleKey = roleSectionLabel(roles)

  return (
    <AppSidebar
      className={`${collapsed ? 'w-20' : 'w-64'} border-slate-400 bg-gray-200 transition-all dark:border-slate-800 dark:bg-slate-900`}
    >
      <div className={`flex items-center px-4 py-5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <img src={logo} alt="Lotus" className="ml-4 h-20 w-auto" />}
        <AppButton variant="brandIcon" onClick={toggle} aria-label="Alternar menu">
          <i className={`pi ${collapsed ? 'pi-angle-right' : 'pi-angle-left'}`} />
        </AppButton>
      </div>

      {!collapsed && roleKey && (
        <p className="px-4 pb-2 text-xs font-semibold tracking-wider text-slate-400">
          {t(roleKey)}
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-4 px-3">
        {modules.map((m) => (
          <SidebarItem key={m.key} module={m} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && <div className="px-4 py-3 text-sm text-slate-400 text-center">{APP_VERSION}</div>}
    </AppSidebar>
  )
}
