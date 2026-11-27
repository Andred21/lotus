import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { backState, loadFailure, useBackNavigation, useUrlTab } from '@shared/hooks'
import { retryFor } from '@shared/lib'
import { useTurma } from '../api/useTurmas'
import { TURMA_TABS } from '../lib/turmaTabs'

/** Orquestração da página de detalhe da turma. O componente só consome. */
export function useTurmaDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const turmaId = Number(id)
  const query = useTurma(turmaId)
  // A aba ativa mora na URL (`useUrlTab`), não em `useState`: é o que faz
  // `?tab=docs` ser um destino de verdade para quem chega de fora da tela (a
  // pendência do redator no dashboard) e o que mantém a barra de endereço
  // honesta. `replace`, preservando o `state` do voltar.
  const { index, setTab } = useUrlTab(TURMA_TABS)
  const location = useLocation()
  const goBack = useBackNavigation('/operacion')

  return {
    turmaId,
    loading: query.isLoading,
    /** Falha do GET da turma — a tela precisa distinguir "não carregou" de
     * "não existe" (spec D16). */
    loadError: loadFailure(query),
    /** `undefined` no 403 (`retryFor`): a página não desenha o Reintentar. */
    reload: retryFor(query.error, (): Promise<unknown> => query.refetch()),
    turma: query.data,
    /** Índice do painel ativo, derivado do nome que está na URL. */
    tab: index,
    setTab,
    goBack,
    // O orçamento volta para ESTA turma (e para a aba em que o usuário estava).
    goToBudget: (budgetId: number) =>
      navigate(`/comercial/presupuestos/${budgetId}`, { state: backState(location) }),
  }
}
