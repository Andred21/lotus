import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { loadFailure } from '@shared/hooks'
import { useTurma } from '../api/useTurmas'
import { turmaTabIndex, turmaTabName } from '../lib/turmaTabs'

/** Orquestração da página de detalhe da turma. O componente só consome. */
export function useTurmaDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const turmaId = Number(id)
  const query = useTurma(turmaId)
  // A aba ativa mora na URL, não em `useState`: é o que faz `?tab=docs` ser um
  // destino de verdade para quem chega de fora da tela (a pendência do redator
  // no dashboard) e o que mantém a barra de endereço honesta depois de o
  // usuário trocar de aba. `replace` porque trocar de aba não é passo de
  // navegação — com `push`, o "voltar" andaria aba a aba antes de sair da
  // página.
  const [params, setParams] = useSearchParams()

  return {
    turmaId,
    loading: query.isLoading,
    /** Falha do GET da turma — a tela precisa distinguir "não carregou" de
     * "não existe" (spec D16). */
    loadError: loadFailure(query),
    reload: (): Promise<unknown> => query.refetch(),
    turma: query.data,
    /** Índice do painel ativo, derivado do nome que está na URL. */
    tab: turmaTabIndex(params.get('tab')),
    setTab: (index: number) => {
      setParams(
        (anterior) => {
          // Cópia do que já está lá, não um `URLSearchParams` novo: a aba é o
          // único parâmetro de hoje, e escrever por cima apagaria em silêncio o
          // próximo que nascer.
          const proximo = new URLSearchParams(anterior)
          proximo.set('tab', turmaTabName(index))
          return proximo
        },
        { replace: true },
      )
    },
    goBack: () => navigate('/operacion'),
    goToBudget: (budgetId: number) => navigate(`/comercial/presupuestos/${budgetId}`),
  }
}
