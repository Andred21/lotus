import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppAvatar, AppMenu } from '@shared/ui'
import type { AppMenuRef, MenuItem } from '@shared/ui'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { useLogout } from '@features/identity/api/useLogout'

/** Capitaliza a primeira role para exibição (ex.: superadmin → SuperAdmin). */
function displayRole(roles: string[]): string {
  const r = roles[0]
  if (!r) return ''
  if (r === 'superadmin') return 'SuperAdmin'
  return r.charAt(0).toUpperCase() + r.slice(1)
}

export function UserMenu() {
  const user = useSessionStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()
  const menuRef = useRef<AppMenuRef>(null)

  if (!user) return null

  const items: MenuItem[] = [
    { label: 'Mi perfil', icon: 'pi pi-user', command: () => navigate('/perfil') },
    { separator: true },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () =>
        logout.mutate(undefined, {
          onSuccess: () => navigate('/login', { replace: true }),
        }),
    },
  ]

  return (
    <div className="flex items-center gap-2">
      <AppAvatar name={user.name} />
      <div className="hidden text-left leading-tight sm:block">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
        <p className="text-xs text-[#25A5E4]">{displayRole(user.roles)}</p>
      </div>
      <button
        onClick={(e) => menuRef.current?.toggle(e)}
        aria-label="Abrir menu do usuário"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <i className="pi pi-angle-down" />
      </button>
      <AppMenu ref={menuRef} model={items} />
    </div>
  )
}
