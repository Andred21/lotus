import { useQuery } from '@tanstack/react-query'
import type { ProblemDetails } from './axios'
import { crudEndpoints } from './crud'
import type { RoleData } from '@shared/types/generated'

/** Listagem de roles para o select do form de usuário e a exibição read-only.
 * Só leitura neste bloco; criação de role customizada entra no 5.2b. */
const endpoints = crudEndpoints<RoleData>('roles')

export const rolesApi = {
  keys: { all: ['roles'] as const },
  useList: () =>
    useQuery<RoleData[], ProblemDetails>({ queryKey: ['roles'], queryFn: endpoints.list }),
}
