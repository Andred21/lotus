import { createCrudResource } from './createCrudResource'
import type { ClientData } from '@shared/types/generated'

/** Cliente REST do recurso `clients`. Camada de dados compartilhada (ADR-18):
 * cotações (Comercial) referenciam cliente; a feature commercial edita o cadastro.
 * Glue burro sobre a rota pública — regra e telas ficam nas features. */
export const clientsApi = createCrudResource<ClientData>('clients')
