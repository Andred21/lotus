import { createElement, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Allowance } from './Allowance'
import { UnsavedChangesBlocker, type BlockedNavigation } from './UnsavedChangesBlocker'

export type UnsavedChangesGuard = {
  /** Sem rascunho, chama `proceed` na hora; com rascunho, abre o diálogo e só chama no Descartar. */
  confirmDiscard: (proceed: () => void) => void
  /**
   * Libera A PRÓXIMA navegação (a que o salvar dispara); depois dela a guarda volta.
   * Chame no `onSuccess`, imediatamente antes do `navigate`.
   */
  allowNavigation: () => void
  dialogProps: {
    visible: boolean
    onConfirm: () => void
    onCancel: () => void
    /** O blocker do router, montado só com rascunho. Precisa estar na árvore: o `DiscardChangesDialog` o renderiza. */
    blocker: ReactNode
  }
}

/**
 * Guarda de rascunho não salvo: sair com formulário sujo pede confirmação.
 *
 * Três portas, uma política. Navegação do router (blocker, só quando o
 * `pathname` muda — `?query` e hash não tiram o usuário da tela), fechar ou
 * recarregar a aba (`beforeunload`, que o navegador confirma com o próprio
 * texto) e ação local de descartar (`confirmDiscard`, para o Cancelar do
 * formulário). As duas primeiras só valem com `dirty`.
 *
 * **Quem consome monta `<DiscardChangesDialog {...guard.dialogProps} />`.** É
 * ele que renderiza `dialogProps.blocker`; sem isso a navegação do router NÃO é
 * guardada (o `beforeunload` e o `confirmDiscard` seguem valendo). O blocker é um
 * filho (`UnsavedChangesBlocker`) que só existe enquanto `dirty`: o router
 * consulta um único blocker, o último registrado, e `useBlocker` registra mesmo
 * com o filtro devolvendo `false` — uma guarda limpa montada depois de uma suja
 * a anularia. Duas guardas sujas ao mesmo tempo continuam sem suporte: vale a
 * última montada.
 *
 * O blocker exige data router — o app o monta em `app/router`, e o helper de
 * teste (`shared/testing/providers`) também.
 *
 * Com a sessão expirada (`sessionStore.expired`) o blocker deixa passar: o
 * único destino é o login, e o rascunho já não tem como ser salvo. O
 * `beforeunload` segue valendo — recarregar a aba é escolha do usuário.
 *
 * `allowNavigation()` existe para o salvar: ele limpa o rascunho e navega no
 * mesmo gesto, e sem a liberação a própria navegação de sucesso abriria o
 * diálogo. Chame-o no `onSuccess`, imediatamente antes do `navigate`: a
 * liberação é consumida pela primeira navegação que o router avaliar, bloqueável
 * ou não — um flag que sobrevivesse a navegações livres furaria a guarda mais
 * tarde, sem ninguém ver. Se o rascunho já estiver limpo ao fim do render, a
 * liberação não usada é descartada.
 */
export function useUnsavedChangesGuard(dirty: boolean): UnsavedChangesGuard {
  const [allowance] = useState(() => new Allowance())
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [blocked, setBlocked] = useState<BlockedNavigation | null>(null)

  useEffect(() => {
    if (!dirty) {
      // Sem blocker montado ninguém consome a liberação; ela não pode esperar o próximo rascunho.
      allowance.revoke()
      return undefined
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Chrome só pergunta com o `returnValue` atribuído.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, allowance])

  const confirmDiscard = useCallback((proceed: () => void) => {
    if (dirty) setPending(() => proceed)
    else proceed()
  }, [dirty])

  const allowNavigation = useCallback(() => { allowance.grant() }, [allowance])

  const onConfirm = () => {
    if (blocked) blocked.proceed()
    if (pending) {
      const proceed = pending
      setPending(null)
      proceed()
    }
  }

  const onCancel = () => {
    if (blocked) blocked.reset()
    setPending(null)
  }

  return {
    confirmDiscard,
    allowNavigation,
    dialogProps: {
      visible: blocked !== null || pending !== null,
      onConfirm,
      onCancel,
      blocker: dirty ? createElement(UnsavedChangesBlocker, { allowance, onBlock: setBlocked }) : null,
    },
  }
}
