import { useSessionStore } from '../stores/sessionStore'

/**
 * Deriva o RBAC efetivo da sessão. `can` checa permissão pontual;
 * `hasRole` checa role. Fonte = SessionUserData (roles[]/permissions[]).
 */
export function usePermissions() {
  const user = useSessionStore((s) => s.user)
  const permissions = user?.permissions ?? []
  const roles = user?.roles ?? []

  return {
    can: (permission: string) => permissions.includes(permission),
    hasRole: (role: string) => roles.includes(role),
    roles,
  }
}
