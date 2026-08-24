import { useEffect, useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useMutationErrors } from './useEntityForm'

/**
 * Abre um blob autenticado numa aba nova.
 *
 * A aba é aberta ANTES da requisição, de propósito: `window.open` fora do
 * gesto do usuário é bloqueado pelo navegador. Se o bloqueio acontecer mesmo
 * assim, `popupBlocked` avisa em vez de o botão só parar de carregar. O
 * objectURL é revogado no unmount para não vazar.
 *
 * Mora em `shared/hooks` porque duas features precisam do mesmo mecanismo —
 * `certification` (PDF do certificado) e `identity` (o mesmo PDF, pela coluna
 * do detalhe do aluno) — e feature não importa feature, nem para tipo
 * (ADR-05). Seria a terceira cópia do mesmo código: o docblock do segundo
 * clone já declarava, por escrito, que era clone.
 *
 * O `useEffect` daqui é liberação de recurso no unmount, não sincronização de
 * estado — não cai na proibição de `useEffect` + `setState` da rule.
 */
export function useBlobTabOpener<TVariables>(
  mutation: UseMutationResult<Blob, ProblemDetails, TVariables>,
) {
  const { message } = useMutationErrors([mutation.error])
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

  const open = (variables: TVariables) => {
    setPopupBlocked(false)
    const tab = window.open('about:blank', '_blank')
    if (!tab) {
      setPopupBlocked(true)
      return
    }

    tab.opener = null
    tabRef.current = tab
    mutation.mutate(variables, {
      onSuccess: (blob) => {
        // Um objectURL vivo por vez: o anterior morre quando o próximo nasce.
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

  return { open, pending: mutation.isPending, popupBlocked, message }
}
