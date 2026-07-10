import { createCrudResource } from '@shared/api/createCrudResource'
import type { RedatorData } from '@shared/types/generated'

export const redatoresApi = createCrudResource<RedatorData>('redatores')
