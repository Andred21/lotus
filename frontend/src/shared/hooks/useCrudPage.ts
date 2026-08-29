import type { ProblemDetails } from '@shared/api/axios'
import { listSource } from './listSource'
import { useCrudDialog, type OneResource } from './useCrudDialog'

/** Opções de query que a PÁGINA pode pedir. Estreito de propósito: quem precisa
 * de `enabled`, `select` ou `queryKey` está usando o recurso direto, não a
 * página, e alargar isto transformaria o hook em porta aberta para o TanStack. */
export interface CrudPageQueryOptions {
  staleTime?: number
}

/** Contrato mínimo que `createCrudResource<T>` satisfaz. Tipado por estrutura
 * para o hook não depender da fábrica inteira. `useOne` é opcional (spec D14):
 * presente, a entidade do dialog que não está na lista vem dele. */
interface ListableResource<T> {
  useList: (options?: CrudPageQueryOptions) => {
    data?: T[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    /** `Promise`, não `unknown`: é o refetch do TanStack Query, e a promise é o
     * que o `AppErrorState` aguarda para manter o Reintentar em `loading`
     * (Q-14). */
    refetch: () => Promise<unknown>
  }
  useOne?: OneResource<T>
}

/**
 * Estado de uma página de módulo CRUD: a lista (`listSource`) e o dialog
 * unificado (`useCrudDialog`).
 *
 * `error` sobe junto com `items` porque sem ele a página não distingue "não há
 * registros" de "não deu para perguntar" (spec D16).
 */
export function useCrudPage<T extends { id?: number }>(
  resource: ListableResource<T>,
  options?: CrudPageQueryOptions,
) {
  const query = resource.useList(options)

  return {
    ...listSource(query),
    ...useCrudDialog(query.data ?? [], resource.useOne),
  }
}
