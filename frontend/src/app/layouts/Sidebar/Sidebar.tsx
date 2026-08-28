import { useTranslation } from 'react-i18next'
import { useUiStore } from '@shared/stores/uiStore'
import { usePermissions, useIsCompactViewport } from '@shared/hooks'
import { NAV_MODULES } from '@shared/config/navigation'
import { APP_VERSION } from '@shared/config/brand'
import { AppButton, AppSidebar, AppLogo } from '@shared/ui'
import { roleSectionLabel } from '@shared/lib'
import { SidebarItem } from './SidebarItem'

export function Sidebar() {

  const { t } = useTranslation()
  const compact = useIsCompactViewport()
  // Abaixo de 1024px a sidebar expandida come a largura útil e empurra a tabela
  // para fora da janela. O colapso é imposto pela viewport sem tocar no estado
  // persistido: ao alargar de volta, a preferência do usuário volta com ele.
  const collapsed = useUiStore((s) => s.sidebarCollapsed) || compact
  const toggle = useUiStore((s) => s.toggleSidebar)
  const { can, roles } = usePermissions()

  const modules = NAV_MODULES.filter((m) => !m.permission || can(m.permission))
  const roleKey = roleSectionLabel(roles)

  // Navy fixa nos DOIS temas (spec §6/UI-04): a sidebar é a assinatura e não
  // acompanha o swap de tema — por isso não há dark: aqui.
  //
  // E é por não acompanhar que ela redeclara o traço de foco: o achado 3 pôs
  // azul-poste no claro (13,37:1 sobre o humo), e azul-poste sobre esta navy
  // seria foco invisível. Aqui vale celeste, que mede 5,29:1 sobre ela.
  return (
    <AppSidebar
      className={`${collapsed ? 'w-20' : 'w-64'} border-white/10 bg-(--brand-navy) [--focus-stroke:var(--brand)] transition-all`}
    >
      {/* Colapsada, a coluna empilha marca e toggle: lado a lado eles não cabem
        * nos 80px do rail. Expandida, o toggle fica na ponta oposta ao logo. */}
      <div
        className={`flex px-4 py-5 ${collapsed ? 'flex-col items-center gap-4' : 'items-center justify-between'}`}
      >
        {/* Colapsada a marca é o glifo, não o wordmark reduzido: o asset é
          * retrato e, na largura do rail, o texto "LOTUS" some. Sem isto o topo
          * do rail ficava vazio — e como o colapso é imposto abaixo de 1024px,
          * tablet e mobile não viam marca nenhuma em rota nenhuma (UI-06 do
          * review de 2026-08-12). */}
        {collapsed ? (
          <AppLogo variant="glyph" className="h-9 w-auto" />
        ) : (
          <AppLogo variant="on-dark" className="h-30 w-auto" />
        )}

        {/* Em compact o colapso é imposto pela viewport: o botão sumir (em vez
          * de girar em falso) é o que preserva a pref persistida (UI-02). */}
        {!compact && (
          <AppButton variant="iconToggle" onClick={toggle} aria-label={t('common.toggleMenu')}>
            <i className={`pi ${collapsed ? 'pi-angle-right' : 'pi-angle-left'}`} />
          </AppButton>
        )}
      </div>

      {!collapsed && roleKey && (
        <p className="px-4 pb-2 text-xs font-semibold tracking-wider text-(--shell-ink-muted)">
          {t(roleKey)}
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-4 px-3">
        {modules.map((m) => (
          <SidebarItem key={m.key} module={m} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && <div className="px-4 py-3 text-sm text-(--shell-ink-muted) text-center">{APP_VERSION}</div>}
    </AppSidebar>
  )
}
