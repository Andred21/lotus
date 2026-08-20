import { useNavigate, useParams } from 'react-router-dom'
import { loadFailure } from '@shared/hooks'
import { useTurma } from '../api/useTurmas'

/** Orquestração da página de detalhe da turma. O componente só consome. */
export function useTurmaDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const turmaId = Number(id)
  const query = useTurma(turmaId)

  return {
    turmaId,
    loading: query.isLoading,
    /** Falha do GET da turma — a tela precisa distinguir "não carregou" de
     * "não existe" (spec D16). */
    loadError: loadFailure(query),
    reload: (): Promise<unknown> => query.refetch(),
    turma: query.data,
    goBack: () => navigate('/operacion'),
    goToBudget: (budgetId: number) => navigate(`/comercial/presupuestos/${budgetId}`),
  }
}
