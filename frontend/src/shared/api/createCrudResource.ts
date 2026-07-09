import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import type { ProblemDetails } from './axios'
import { crudEndpoints } from './crud'

/** Fábrica de hooks CRUD sobre TanStack Query para um recurso REST padrão
 * (index/show/store/update/destroy). Sub-recursos aninhados ficam fora daqui,
 * como hooks pequenos por feature que invalidam `keys.all`. */
export function createCrudResource<T>(resource: string) {
  const keys = {
    all: [resource] as const,
    lists: () => [resource, 'list'] as const,
    detail: (id: number | string) => [resource, 'detail', id] as const,
  }
  const endpoints = crudEndpoints<T>(resource)

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

  return { keys, endpoints, useList, useOne, useCreate, useUpdate, useRemove }
}
