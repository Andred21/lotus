import type { ReactNode } from 'react'
import { useSessionBootstrap } from '@features/identity/hooks/useSessionBootstrap'
import { AppIcon } from '@shared/ui'

/**
 * Casca de boot: delega a resolução da sessão ao hook da feature identity e
 * só decide o que renderizar. app/ não manipula o store direto — a regra de
 * sessão vive na feature.
 */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const status = useSessionBootstrap()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AppIcon name="spinner" className="animate-spin size-[1.875rem]" />
      </div>
    )
  }

  return <>{children}</>
}
