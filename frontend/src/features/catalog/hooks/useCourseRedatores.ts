import { useNavigate } from 'react-router-dom'
import { redatoresApi } from '@shared/api/redatoresApi'
import { usePermissions } from '@shared/hooks'

/** Redatores da seção do diálogo de curso. Molde: `useRedatorCourses` de
 * `identity` — o hook devolve o derivado e os estados, nunca o objeto de query.
 *
 * `isError` fica exposto SEPARADO do `?? []`: um 403 não pode se disfarçar de
 * "curso sem redatores habilitados" num curso que tem três (D11 do bloco de
 * cards). Os três estados da tela dependem disso.
 *
 * A navegação mora aqui, não no componente: o olho leva ao módulo dono do
 * redator, e `catalog` não pode importar o RedatorDialog de `identity`
 * (lei §6) — composição cruzada mora na rota. Sem `identity.user.view` a
 * página de destino não serviria de nada, então o olho não aparece.
 * `onClose` fecha o diálogo ANTES de navegar; inverter deixaria o diálogo
 * aberto sobre a rota nova. */
export function useCourseRedatores(enabledIds: number[], onClose: () => void) {
  const redatores = redatoresApi.useList()
  const allRedatores = redatores.data ?? []
  const navigate = useNavigate()
  const { can } = usePermissions()

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
    canOpenRedator: can('identity.user.view'),
    openRedator: (id: number) => {
      onClose()
      navigate(`/personas?redator=${id}`)
    },
  }
}
