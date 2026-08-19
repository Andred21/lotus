import { createCrudResource } from './createCrudResource'
import type { ArchivedUserData, UserData } from '@shared/types/generated'

/** Cliente REST do recurso `users` (staff, type=admin). Camada compartilhada
 * (ADR-18): a feature identity edita; glue burro sobre a rota REST.
 *
 * O segundo genérico é o que faz `useArchivedList`/`useRestore` falarem o DTO
 * composto de arquivados (spec D12). */
export const usersApi = createCrudResource<UserData, ArchivedUserData>('users')
