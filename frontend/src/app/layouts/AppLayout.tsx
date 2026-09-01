import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar/Sidebar'
import { Header } from './Header/Header'

export function AppLayout() {
  const { t } = useTranslation()

  // O tema é aplicado globalmente nos providers (useApplyTheme).
  return (
    <div className="relative flex h-screen overflow-hidden bg-(--surface-ground)">
      {/* Primeiro focável da aplicação, visível só no foco. Antes dele havia 11
        * paradas de teclado — botão de menu, 7 links da barra, idioma, tema,
        * usuário — antes do primeiro elemento acionável do conteúdo, e o
        * Dashboard é a rota inicial, então é quem mais paga (UI-06 do review de
        * 2026-08-17). O atalho é do shell porque o custo é do shell: toda rota
        * protegida o herda.
        *
        * `tabIndex={-1}` no `<main>` é o que faz o salto colar — sem ele o
        * navegador move a rolagem e devolve o foco ao `body`, e o próximo Tab
        * volta ao começo da barra. */}
      <a
        href="#contenido"
        className="sr-only rounded-control border px-3 py-2 text-sm font-medium no-underline focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
        style={{
          background: 'var(--surface-card)',
          borderColor: 'var(--surface-border)',
          color: 'var(--text-color)',
        }}
      >
        {t('common.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main id="contenido" tabIndex={-1} className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
