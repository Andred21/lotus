import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { NavModule } from '@/shared/config/navigation'

interface Props {
  module: NavModule
  collapsed: boolean
}

/** Item de nav custom (NavLink) — estado ativo via router, sem PrimeReact. */
export function SidebarItem({ module, collapsed }: Props) {
  const { t } = useTranslation()
  const label = t(module.labelKey)
  return (
    <NavLink
      to={module.path}
      end={module.path === '/'}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-4 rounded-md px-3 py-2.5 font-medium transition-colors no-underline border-l-2',
          isActive
            ? 'border-(--brand) bg-white/5 text-(--brand)'
            : 'border-transparent text-slate-300 hover:bg-white/10',
          collapsed ? 'justify-center' : '',
        ].join(' ')
      }
    >
      <i className={module.icon} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}
