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
 * que nenhum feedback. Os dois formatos dividem o mesmo `problemFromBlob` e a
 * mesma revogação de objectURL — daí um hook só.
 *
 * O que eles NÃO dividem é estado: erro e `pending` são por formato. Fundidos,
 * o erro do PDF continuava na tela depois de o DOCX baixar com sucesso — só a
 * mutação disparada reseta o próprio erro, e `useMutationErrors` devolve o
 * primeiro erro que encontra — e os dois botões giravam juntos, anunciando o
 * Word enquanto quem tinha sido pedido era o PDF.
 */
export function useTurmaManualOpener(turmaId: number) {
  const manual = useTurmaManual()
  const docx = useTurmaManualDocx()
  const pdfError = useMutationErrors([manual.error]).message
  const docxError = useMutationErrors([docx.error]).message
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

  /** Um objectURL vivo por vez: o anterior morre quando o próximo nasce. */
  const keepUrl = (blob: Blob) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = URL.createObjectURL(blob)

    return urlRef.current
  }

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
        tab.location.href = keepUrl(blob)
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
        // Âncora ANEXADA ao documento: navegador ignora o `click()` de um nó
        // desconectado. E a URL fica viva no `urlRef` em vez de ser revogada no
        // mesmo stack do clique — revogar antes de o download começar o
        // cancela. Quem libera é a próxima geração ou o unmount, como no PDF.
        const anchor = document.createElement('a')
        anchor.href = keepUrl(blob)
        anchor.download = `manual-turma-${turmaId}.docx`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      },
    })
  }

  return {
    openPdf,
    downloadDocx,
    pdfPending: manual.isPending,
    docxPending: docx.isPending,
    popupBlocked,
    pdfError,
    docxError,
  }
}
