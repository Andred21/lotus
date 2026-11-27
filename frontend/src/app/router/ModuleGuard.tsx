import type { ReactNode } from 'react'
import { usePermissions } from '@shared/hooks'
import { ForbiddenPage } from '@app/pages/Errors/ForbiddenPage'

/**
 * Guard de rota por módulo: o MESMO filtro de permissão do `Sidebar`
 * (`NAV_MODULES`), agora também para quem chega por link direto. É conveniência
 * de interface — a API segue sendo a fronteira autoritativa (ADR-07).
 */
export function ModuleGuard({ permission, children }: { permission?: string; children: ReactNode }) {
  const { can } = usePermissions()

  if (permission && !can(permission)) return <ForbiddenPage />
  return <>{children}</>
}
