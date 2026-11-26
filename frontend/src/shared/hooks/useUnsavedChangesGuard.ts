import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'

export type UnsavedChangesGuard = {
  /** Sem rascunho, chama `proceed` na hora; com rascunho, abre o diálogo e só chama no Descartar. */
  confirmDiscard: (proceed: () => void) => void
  /** Libera A PRÓXIMA navegação (a que o salvar dispara); depois dela a guarda volta. */
  allowNavigation: () => void
  dialogProps: { visible: boolean; onConfirm: () => void; onCancel: () => void }
}

/**
 * Guarda de rascunho não salvo: sair com formulário sujo pede confirmação.
 *
 * Três portas, uma política. Navegação do router (`useBlocker`, só quando o
 * `pathname` muda — `?query` e hash não tiram o usuário da tela), fechar ou
 * recarregar a aba (`beforeunload`, que o navegador confirma com o próprio
 * texto) e ação local de descartar (`confirmDiscard`, para o Cancelar do
 * formulário). As duas primeiras só valem com `dirty`.
 *
 * `useBlocker` exige data router — o app o monta em `app/router`, e o helper
 * de teste (`shared/testing/providers`) também.
 *
 * `allowNavigation()` existe para o salvar: ele limpa o rascunho e navega no
 * mesmo gesto, e sem a liberação a própria navegação de sucesso abriria o
 * diálogo. A liberação é consumida pela primeira navegação que o router avaliar,
 * bloqueável ou não — um flag que sobrevivesse a navegações livres furaria a
 * guarda mais tarde, sem ninguém ver.
 */
export function useUnsavedChangesGuard(dirty: boolean): UnsavedChangesGuard {
  const allowed = useRef(false)
  const [pending, setPending] = useState<(() => void) | null>(null)

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowed.current) {
      allowed.current = false
      return false
    }
    return dirty && currentLocation.pathname !== nextLocation.pathname
  })

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Chrome só pergunta com o `returnValue` atribuído.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const confirmDiscard = useCallback((proceed: () => void) => {
    if (dirty) setPending(() => proceed)
    else proceed()
  }, [dirty])

  const allowNavigation = useCallback(() => { allowed.current = true }, [])

  const onConfirm = () => {
    if (blocker.state === 'blocked') blocker.proceed()
    if (pending) {
      const proceed = pending
      setPending(null)
      proceed()
    }
  }

  const onCancel = () => {
    if (blocker.state === 'blocked') blocker.reset()
    setPending(null)
  }

  return {
    confirmDiscard,
    allowNavigation,
    dialogProps: { visible: blocker.state === 'blocked' || pending !== null, onConfirm, onCancel },
  }
}
