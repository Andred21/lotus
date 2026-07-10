import { createCrudResource } from './createCrudResource'
import type { RedatorData } from '@shared/types/generated'

/** Cliente REST do recurso `redatores`. Camada de dados compartilhada (ADR-18):
 * o catálogo lista redatores para exibir/habilitar e a feature identity edita.
 * Glue burro sobre a rota pública — regra e telas ficam nas features. */
export const redatoresApi = createCrudResource<RedatorData>('redatores')
