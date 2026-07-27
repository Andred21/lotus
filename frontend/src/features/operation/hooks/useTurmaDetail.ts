import { useNavigate, useParams } from 'react-router-dom'
import type { ProblemDetails } from '@shared/api/axios'
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
     * "não existe" (spec D16). O cast é obrigatório: a página lê `.detail`. */
    loadError: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    reload: () => { void query.refetch() },
    turma: query.data,
    goBack: () => navigate('/operacion'),
    goToBudget: (budgetId: number) => navigate(`/comercial/presupuestos/${budgetId}`),
  }
}
