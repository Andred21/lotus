import { redatoresApi } from '@shared/api/redatoresApi'

/** Redatores da seção do diálogo de curso. Molde: `useRedatorCourses` de
 * `identity` — o hook devolve o derivado e os estados, nunca o objeto de query.
 *
 * `isError` fica exposto SEPARADO do `?? []`: um 403 não pode se disfarçar de
 * "curso sem redatores habilitados" num curso que tem três (D11 do bloco de
 * cards). Os três estados da tela dependem disso. */
export function useCourseRedatores(enabledIds: number[]) {
  const redatores = redatoresApi.useList()
  const allRedatores = redatores.data ?? []

  return {
    isLoading: redatores.isLoading,
    isError: redatores.isError,
    errorDetail: redatores.error?.detail,
    refetch: () => {
      void redatores.refetch()
    },
    allRedatores,
    // Leitura (view/edit): só os já habilitados, derivados da lista viva.
    enabledRedatores: allRedatores.filter((r) => enabledIds.includes(r.id as number)),
  }
}
