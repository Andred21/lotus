import { createCrudResource } from '@shared/api/createCrudResource'
import type { ClientData } from '@shared/types/generated'

export const clientsApi = createCrudResource<ClientData>('clients')
