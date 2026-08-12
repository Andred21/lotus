import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppAvatar, AppButton, AppMenu } from '@shared/ui'
import type { AppMenuRef, MenuItem } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useLogout } from '@features/identity/api/authApi'
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
    /* O gatilho envolve avatar, identificação e chevron — não só o chevron.
     *
     * A 320px o botão do chevron ficava 18px fora da tela, sem rolagem
     * horizontal que o alcançasse: sobrava metade da área de clique e o chevron
     * não aparecia (UI-04 do review de 2026-08-12). O que devolvia esses pixels
     * era o padding do botão em volta de um ícone de 12px; com o avatar — que
     * já estava na barra — dentro do mesmo controle, o gatilho inteiro mede 64px
     * e termina em 308 contra a viewport de 320. O chevron fica: medido, ele
     * cabe, e some-lo custaria a affordance que o achado cobra.
     *
     * O botão não tem visual próprio (sem padding, sem fundo, sem hover): quem
     * pinta são os filhos, exatamente como antes. O que ele acrescenta é o anel
     * de foco em volta do bloco inteiro, que é o alvo real — e um nome acessível
     * só onde antes havia um controle mudo ao lado de um avatar decorativo. */
    <div className="flex min-w-0 items-center">
      <AppButton
        text
        aria-label={t('common.openUserMenu')}
        onClick={(e) => menuRef.current?.toggle(e)}
        className="flex min-w-0 items-center gap-1 bg-transparent! p-0! hover:bg-transparent! sm:gap-2"
      >

        <AppAvatar name={user.name} size="large" className="shrink-0!" />

      {/* Texto branco cravado, não token de tema: a navy do header é fixa nos
        * dois temas e `--text-color` é cinza de superfície clara — media 1,42:1
        * aqui (D-P13).
        * O papel era celeste (5,29:1, passava) e virou branco por decisão do
        * João em 2026-08-12: o acento da marca sobre a navy fica com o item
        * ativo da sidebar, e aqui a hierarquia se faz por peso e opacidade, não
        * por cor.
        * `my-0` porque o projeto não carrega o Preflight e o <p> ainda traz a
        * margem de 1em do user-agent; `truncate` porque nome longo empurrava a
        * barra em vez de cortar. */}
        <div className="hidden min-w-0 max-w-40 text-left sm:block lg:max-w-56">
          <p className="my-0 truncate text-sm font-semibold text-white">{user.name}</p>

          <p className="my-0 truncate text-sm text-white/75">{roleKey && t(roleKey)}</p>
        </div>

        <i className="pi pi-angle-down" aria-hidden="true" />

      </AppButton>

      {/* Fora do gatilho: <button> não pode conter conteúdo interativo, e o
        * popup do Prime renderiza no lugar onde é declarado. */}
      <AppMenu ref={menuRef} model={items} className='mt-2 text-md' />

    </div>
  )
}
