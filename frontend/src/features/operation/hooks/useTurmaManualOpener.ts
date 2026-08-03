import { useEffect, useRef, useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import { useTurmaManual } from '../api/useTurmas'

/**
 * Abre o manual da turma numa aba nova. O PDF é buscado como blob (a rota exige
 * o cookie de sessão) e o objectURL é revogado no unmount para não vazar.
 *
 * A aba é aberta ANTES da requisição, de propósito: `window.open` fora do gesto
 * do usuário é bloqueado pelo navegador. Se o bloqueio acontecer mesmo assim,
 * `popupBlocked` avisa em vez de o botão só parar de carregar.
 *
 * O `useEffect` daqui é liberação de recurso no unmount — não é sincronização
 * de estado, então não cai na proibição de `useEffect` + `setState` da rule.
 */
export function useTurmaManualOpener(turmaId: number) {
  const manual = useTurmaManual()
  const { message } = useMutationErrors([manual.error])
  const urlRef = useRef<string | null>(null)
  const tabRef = useRef<Window | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      tabRef.current?.close()
    },
    [],
  )

  const open = () => {
    setPopupBlocked(false)
    const tab = window.open('about:blank', '_blank')
    if (!tab) {
      setPopupBlocked(true)
      return
    }

    tab.opener = null
    tabRef.current = tab
    manual.mutate(turmaId, {
      onSuccess: (blob) => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        tab.location.href = urlRef.current
        tabRef.current = null
      },
      onError: () => {
        tab.close()
        tabRef.current = null
      },
    })
  }

  return { open, pending: manual.isPending, popupBlocked, message }
}
