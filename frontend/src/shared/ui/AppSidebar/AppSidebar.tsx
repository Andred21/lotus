import type { ReactNode } from 'react'

/**
 * Wrapper semântico da barra lateral do shell — um rail FIXO no fluxo do
 * layout, não o overlay/drawer do PrimeReact Sidebar. Wrapper próprio
 * (regra do projeto). Largura, cores e transição vêm via `className`.
 */
export function AppSidebar({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <aside className={`flex h-screen flex-col border-r ${className}`}>{children}</aside>
  )
}
