import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppAvatar, AppButton, AppMenu } from '@shared/ui'
import type { AppMenuRef, MenuItem } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useLogout } from '@features/identity/api/useLogout'
import { displayRole } from '@shared/lib'

export function UserMenu() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()
  const menuRef = useRef<AppMenuRef>(null)

  if (!user) return null

  const roleKey = displayRole(user.roles)

  const items: MenuItem[] = [
    { label: t('userMenu.profile'), icon: 'pi pi-user', command: () => navigate('/perfil') },
    { separator: true },
    {
      label: t('userMenu.logout'),
      icon: 'pi pi-sign-out',
      command: () =>
        logout.mutate(undefined, {
          onSuccess: () => navigate('/login', { replace: true }),
        }),
    },
  ]

  return (
    <div className="flex items-center gap-2">

      <AppAvatar name={user.name}  size='large'/>
      
      <div className="hidden text-left -my-1 sm:block">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>

        <p className="text-sm text-[#25A5E4]">{roleKey && t(roleKey)}</p>
      </div>

      <AppButton
        text
        rounded
        aria-label="Abrir menu do usuário"
        onClick={(e) => menuRef.current?.toggle(e)}
      >
        <i className="pi pi-angle-down" />
      </AppButton>

      <AppMenu ref={menuRef} model={items} className='mt-2 text-md' />

    </div>
  )
}
