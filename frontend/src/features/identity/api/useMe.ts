import { useQuery } from '@tanstack/react-query'
import { fetchMe } from './authApi'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,       // 401 no boot = deslogado, não re-tentar
    staleTime: Infinity,
  })
}
