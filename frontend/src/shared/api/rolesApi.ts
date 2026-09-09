import { useQuery } from '@tanstack/react-query'
import { createCrudResource } from './createCrudResource'
import { api } from './axios'
import type { ProblemDetails } from './axios'
import type { RoleData, RoleOptionData } from '@shared/types/generated'

/** Cliente REST do recurso `roles`.
 *
 * `useList` alimenta a tabela de Roles y Permisos e `useCreate`/`useUpdate` a
 * escrita — os três sob `identity.access.manage`, porque o índice devolve as
 * permissões de toda role. O select do form de usuário usa `useAssignable`,
 * que fala com o lookup enxuto sob `identity.user.view` (D-10): quem monta um
 * dropdown não precisa enumerar permissão. */
export const rolesApi = {
  ...createCrudResource<RoleData>('roles'),
  useAssignable: () =>
    useQuery<RoleOptionData[], ProblemDetails>({
      queryKey: ['roles', 'assignable'] as const,
      queryFn: () => api.get<RoleOptionData[]>('/api/roles/assignable').then((r) => r.data),
    }),
}
