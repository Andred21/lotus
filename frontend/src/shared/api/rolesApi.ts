import { createCrudResource } from './createCrudResource'
import type { RoleData } from '@shared/types/generated'

/** Cliente REST do recurso `roles`. `useList` alimenta o select do form de
 * usuário e a tabela de roles; `useCreate`/`useUpdate` a aba Roles y Permisos. */
export const rolesApi = createCrudResource<RoleData>('roles')
