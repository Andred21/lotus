import { useEffect, useRef, useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import { useTurmaManual, useTurmaManualDocx } from '../api/useTurmas'

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
 *
 * O DOCX baixa em vez de abrir: navegador não renderiza WordprocessingML, e
 * uma aba com `about:blank` esperando um blob que ele não sabe exibir é pior
 * que nenhum feedback. Os dois formatos dividem o mesmo `problemFromBlob`, o
 * mesmo `pending` e a mesma revogação de objectURL — daí um hook só.
 */
export function useTurmaManualOpener(turmaId: number) {
  const manual = useTurmaManual()
  const docx = useTurmaManualDocx()
  const { message } = useMutationErrors([manual.error, docx.error])
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

  const openPdf = () => {
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

  const downloadDocx = () => {
    setPopupBlocked(false)
    docx.mutate(turmaId, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `manual-turma-${turmaId}.docx`
        anchor.click()
        URL.revokeObjectURL(url)
      },
    })
  }

  return {
    openPdf,
    downloadDocx,
    pending: manual.isPending || docx.isPending,
    popupBlocked,
    message,
  }
}
