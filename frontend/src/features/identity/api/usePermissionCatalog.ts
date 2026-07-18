import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { PermissionData } from '@shared/types/generated'

/** Catálogo fixo de permissões (read-only) para compor roles customizadas.
 * Gate identity.access.manage no backend — só superadmin recebe 200. */
export function usePermissionCatalog() {
  return useQuery<PermissionData[], ProblemDetails>({
    queryKey: ['permissions'],
    queryFn: () => api.get<PermissionData[]>('/api/permissions').then((r) => r.data),
  })
}
