import { NavLink } from 'react-router-dom'
import type { NavModule } from '@/shared/config/navigation'

interface Props {
  module: NavModule
  collapsed: boolean
}

/** Item de nav custom (NavLink) — estado ativo via router, sem PrimeReact. */
export function SidebarItem({ module, collapsed }: Props) {
  return (
    <NavLink
      to={module.path}
      end={module.path === '/'}
      title={collapsed ? module.label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors no-underline',
          isActive
            ? 'bg-[#25A5E4] text-white'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          collapsed ? 'justify-center' : '',
        ].join(' ')
      }
    >
      <i className={module.icon} />
      {!collapsed && <span>{module.label}</span>}
    </NavLink>
  )
}
