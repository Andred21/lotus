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
     * só onde antes havia um controle mudo ao lado de um avatar decorativo.
     * Esse "sem visual próprio" é um variant do AppButton, não Tailwind cru
     * daqui: customização de componente Prime mora no wrapper (ADR-16 §3). */
    <div className="flex min-w-0 items-center">
      <AppButton
        variant="noSurface"
        text
        onClick={(e) => menuRef.current?.toggle(e)}
        className="flex min-w-0 items-center gap-1 sm:gap-2"
      >

        {/* Decorativo para o leitor de tela: as iniciais (ou o alt da foto)
          * repetiriam o nome que vem logo abaixo, agora que o nome acessível do
          * gatilho é o conteúdo e não mais um rótulo à parte. */}
        <AppAvatar name={user.name} image={user.photo_url} size="large" aria-hidden className="shrink-0!" />

      {/* Texto branco cravado, não token de tema: a navy do header é fixa nos
        * dois temas e `--text-color` é cinza de superfície clara — media 1,42:1
        * aqui (D-P13).
        * O papel era celeste (5,29:1, passava) e virou branco por decisão do
        * João em 2026-08-12: o acento da marca sobre a navy fica com o item
        * ativo da sidebar, e aqui a hierarquia se faz por peso e opacidade, não
        * por cor.
        * <span> no lugar de <div>/<p>: <button> só aceita conteúdo de frase.
        * Some junto a margem de 1em do user-agent que o <p> trazia (o projeto
        * não carrega o Preflight) e que era zerada à mão aqui; `truncate`
        * porque nome longo empurrava a barra em vez de cortar.
        * O gatilho NÃO ficou conforme com isso: a raiz do Avatar do PrimeReact
        * é sempre um <div> (`avatar.cjs.js:254`), e ele é filho deste botão.
        * Desvio consciente (S-1 do review de 2026-08-12, decisão do João):
        * nenhum parser fecha o <button> num <div> — o sintoma era o texto, que
        * saiu —, e um círculo de frase aqui significaria reimplementar o
        * fallback foto→iniciais fora do wrapper. Não escreva que este botão só
        * tem conteúdo de frase; ele não tem.
        * `sr-only sm:not-sr-only`, e não ocultação por display: este bloco É o
        * nome acessível do gatilho, então abaixo do sm ele sai da TELA, não da
        * árvore — escondê-lo tirava a identidade da sessão do leitor de tela
        * (Q-1 do review de 2026-08-12). Fora de fluxo nos dois casos: nada
        * muda visualmente. */}
        <span className="sr-only min-w-0 max-w-40 text-left sm:not-sr-only sm:block lg:max-w-56">
          <span className="block truncate text-sm font-semibold text-white">{user.name}</span>

          <span className="block truncate text-sm text-white/75">{roleKey && t(roleKey)}</span>
        </span>

        <i className="pi pi-angle-down" aria-hidden="true" />

      </AppButton>

      {/* Fora do gatilho: <button> não pode conter conteúdo interativo, e o
        * popup do Prime renderiza no lugar onde é declarado. */}
      <AppMenu ref={menuRef} model={items} className="mt-2" />

    </div>
  )
}
