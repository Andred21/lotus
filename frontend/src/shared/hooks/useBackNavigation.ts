import { useLocation, useNavigate, type Location } from 'react-router-dom'

interface BackState {
  backTo: string
}

/**
 * O `state` que a lista entrega ao detalhe: a URL COMPLETA de onde o usuário
 * saiu (caminho + busca/página/filtros, C-3). Quem navega da lista ao detalhe
 * passa `navigate(path, { state: backState(location) })`.
 */
export function backState(location: Location): BackState {
  return { backTo: `${location.pathname}${location.search}` }
}

function hasBackTo(state: unknown): state is BackState {
  return typeof state === 'object' && state !== null && typeof (state as BackState).backTo === 'string'
}

/**
 * "Volver" pelo histórico. Com `backTo` no `state`, a entrada anterior É a
 * lista (com a busca na URL), então recuar a reencontra como estava; empurrar
 * a URL de novo criaria uma entrada duplicada e o "voltar" do navegador
 * ficaria preso entre as duas. Sem `backTo` (link de fora, dashboard) não há
 * entrada confiável para recuar: vai ao `fallback`.
 */
export function useBackNavigation(fallback: string): () => void {
  const navigate = useNavigate()
  const { state } = useLocation()
  return () => {
    if (hasBackTo(state)) void navigate(-1)
    else void navigate(fallback)
  }
}
