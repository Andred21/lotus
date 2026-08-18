import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import type { ProblemDetails } from './axios'
import { crudEndpoints } from './crud'

/** Fábrica de hooks CRUD sobre TanStack Query para um recurso REST padrão
 * (index/show/store/update/destroy). Sub-recursos aninhados ficam fora daqui,
 * como hooks pequenos por feature que invalidam `keys.all`. */
export function createCrudResource<T, TArchived = T>(resource: string) {
  const keys = {
    all: [resource] as const,
    lists: () => [resource, 'list'] as const,
    archived: () => [resource, 'archived'] as const,
    detail: (id: number | string) => [resource, 'detail', id] as const,
  }
  const endpoints = crudEndpoints<T, TArchived>(resource)

  function useList(options?: Partial<UseQueryOptions<T[], ProblemDetails>>) {
    return useQuery<T[], ProblemDetails>({ queryKey: keys.lists(), queryFn: endpoints.list, ...options })
  }

  function useOne(id: number | string | undefined, options?: Partial<UseQueryOptions<T, ProblemDetails>>) {
    return useQuery<T, ProblemDetails>({
      queryKey: keys.detail(id ?? 'none'),
      queryFn: () => endpoints.get(id as number | string),
      ...options,
      enabled: id != null,
    })
  }

  function useCreate() {
    const qc = useQueryClient()
    return useMutation<T, ProblemDetails, unknown>({
      mutationFn: (payload) => endpoints.create(payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useUpdate() {
    const qc = useQueryClient()
    return useMutation<T, ProblemDetails, { id: number | string; payload: unknown }>({
      mutationFn: ({ id, payload }) => endpoints.update(id, payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useRemove() {
    const qc = useQueryClient()
    return useMutation<void, ProblemDetails, number | string>({
      mutationFn: (id) => endpoints.remove(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  /**
   * `enabled` é PARÂMETRO, não default: a visão de arquivados não pode buscar
   * na montagem. É a lição medida na D-04 — carregar as duas visões de uma vez
   * dobra a rede sem ganho nenhum.
   */
  function useArchivedList(enabled: boolean) {
    return useQuery<TArchived[], ProblemDetails>({
      queryKey: keys.archived(),
      queryFn: endpoints.archived,
      enabled,
    })
  }

  /**
   * Invalida `keys.all`, que é `[resource]` e cobre a lista ativa E a de
   * arquivados. `useRemove` já invalida o mesmo, então arquivar atualiza a
   * lista de arquivados sem código novo.
   */
  function useRestore() {
    const qc = useQueryClient()
    return useMutation<T, ProblemDetails, number | string>({
      mutationFn: (id) => endpoints.restore(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  return {
    keys,
    endpoints,
    useList,
    useOne,
    useCreate,
    useUpdate,
    useRemove,
    useArchivedList,
    useRestore,
  }
}
