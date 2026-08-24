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
  const mountedRef = useRef(true)
  const [popupBlocked, setPopupBlocked] = useState(false)

  useEffect(
    () => () => {
      mountedRef.current = false
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
        // Só zera `tabRef` se ele ainda apontar para ESTA aba — um `open()`
        // sobreposto já pode ter posto a próxima aba lá, e essa referência
        // não é desta chamada para apagar.
        if (tabRef.current === tab) tabRef.current = null
        // Callback por chamada pode disparar depois do unmount (não é
        // garantia do TanStack): desmontado, a aba já foi fechada pelo
        // cleanup e não há para onde apontar — criar o objectURL aqui só
        // vazaria, porque o cleanup que o revogaria já rodou.
        if (!mountedRef.current) return
        // Um objectURL vivo por vez: o anterior morre quando o próximo nasce.
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        tab.location.href = urlRef.current
      },
      onError: () => {
        tab.close()
        if (tabRef.current === tab) tabRef.current = null
      },
    })
  }

  return { open, pending: mutation.isPending, popupBlocked, message }
}
