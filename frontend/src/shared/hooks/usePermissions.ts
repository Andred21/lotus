import { useSessionStore } from '@shared/stores/sessionStore'

/**
 * Deriva o RBAC efetivo da sessão. `can` checa permissão pontual; `hasRole`
 * checa role. Fonte = SessionUserData (roles[]/permissions[]).
 *
 * ATENÇÃO: isto é conveniência de interface, NÃO segurança. Esconder um botão
 * não impede a chamada. A autorização real é do backend (ADR-07).
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
