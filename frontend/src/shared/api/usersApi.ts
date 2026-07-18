import { createCrudResource } from './createCrudResource'
import type { UserData } from '@shared/types/generated'

/** Cliente REST do recurso `users` (staff, type=admin). Camada compartilhada
 * (ADR-18): a feature identity edita; glue burro sobre a rota REST. */
export const usersApi = createCrudResource<UserData>('users')
