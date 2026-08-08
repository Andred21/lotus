import { useEffect, useRef, useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import { useCertificatePdf } from '../api/certificatesApi'

/**
 * Abre o PDF do certificado numa aba nova. Clone de
 * `features/operation/hooks/useTurmaManualOpener.ts` sobre `useCertificatePdf`
 * em vez de `useTurmaManual` — mesmo mecanismo (blob autenticado, aba aberta
 * ANTES da requisição por causa do bloqueio de popup fora do gesto do
 * usuário), copiado em vez de importado porque uma feature nunca importa
 * outra (nem para tipo).
 *
 * O `useEffect` aqui é liberação de recurso no unmount, não sincronização de
 * estado — não cai na proibição de `useEffect` + `setState` da rule.
 */
export function useCertificatePdfOpener(certificateId: number) {
  const pdf = useCertificatePdf()
  const { message } = useMutationErrors([pdf.error])
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
    pdf.mutate(certificateId, {
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

  return { open, pending: pdf.isPending, popupBlocked, message }
}
