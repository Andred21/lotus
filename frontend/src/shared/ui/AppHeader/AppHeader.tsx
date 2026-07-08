import type { ReactNode } from 'react'

/**
 * Wrapper semântico do cabeçalho do shell. PrimeReact não possui um
 * componente <header>; este é o wrapper próprio (regra do projeto: componente
 * custom mora em shared/ui). Traz o layout base; cores vêm via `className`.
 */
export function AppHeader({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <header className={`flex items-center justify-between border-b px-6  ${className}`}>
      {children}
    </header>
  )
}
