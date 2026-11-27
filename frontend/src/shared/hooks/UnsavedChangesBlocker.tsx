import { useCallback, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { Allowance } from './Allowance'

/** A navegação que o router segurou, com as duas saídas dela. */
export type BlockedNavigation = { proceed: () => void; reset: () => void }

type Navegacao = { currentLocation: { pathname: string }; nextLocation: { pathname: string } }

/**
 * Registra o blocker do router — e só existe enquanto há rascunho.
 *
 * O router consulta um único blocker (o último registrado), e `useBlocker`
 * registra mesmo quando o filtro devolve `false`. Uma guarda limpa montada
 * depois de uma suja a anularia; por isso o `useUnsavedChangesGuard` só monta
 * este componente com `dirty` e o desmonta ao limpar. Quem o monta é o
 * consumidor, via `dialogProps.blocker` (o `DiscardChangesDialog` já o faz).
 *
 * Só o `pathname` bloqueia: `?query` e hash não tiram o usuário da tela. A
 * liberação de `allowNavigation` é consumida pela primeira navegação avaliada,
 * bloqueável ou não.
 *
 * Sessão expirada não bloqueia: o diálogo "descartar?" seguraria o usuário numa
 * tela cujo salvar já não funciona, e o único destino possível é o login (o
 * `from` guarda a URL para a volta). O estado é lido NA HORA da navegação, não de
 * um render anterior: o redirecionamento nasce no mesmo gesto que expira.
 */
export function UnsavedChangesBlocker({ allowance, onBlock }: {
  allowance: Allowance
  onBlock: (blocked: BlockedNavigation | null) => void
}) {
  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: Navegacao) => {
      if (allowance.consume()) return false
      if (useSessionStore.getState().expired) return false
      return currentLocation.pathname !== nextLocation.pathname
    },
    [allowance],
  )
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    onBlock(blocker.state === 'blocked' ? { proceed: blocker.proceed, reset: blocker.reset } : null)
  }, [blocker, onBlock])

  // Desmontar (rascunho limpo) não deixa um diálogo órfão apontando para o router.
  useEffect(() => () => onBlock(null), [onBlock])

  return null
}
