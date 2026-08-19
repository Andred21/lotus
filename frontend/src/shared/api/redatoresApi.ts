import { createCrudResource } from './createCrudResource'
import type { ArchivedRedatorData, RedatorData } from '@shared/types/generated'

/** Cliente REST do recurso `redatores`. Camada de dados compartilhada (ADR-18):
 * o catálogo lista redatores para exibir/habilitar e a feature identity edita.
 * Glue burro sobre a rota pública — regra e telas ficam nas features.
 *
 * O segundo genérico é o que faz `useArchivedList`/`useRestore` falarem o DTO
 * composto de arquivados (spec D12). */
export const redatoresApi = createCrudResource<RedatorData, ArchivedRedatorData>('redatores')
