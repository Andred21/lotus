import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Toast } from 'primereact/toast'

type ToastApi = {
  success: (detail: string) => void
  error: (detail: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Toast global da SPA. Único ponto que conhece o `Toast` do PrimeReact; as
 * features consomem só `useToast()` (ADR-05). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Toast>(null)

  const success = useCallback((detail: string) => {
    ref.current?.show({ severity: 'success', detail, life: 5000 })
  }, [])

  const error = useCallback((detail: string) => {
    ref.current?.show({ severity: 'error', detail, life: 8000 })
  }, [])

  const api = useMemo<ToastApi>(() => ({ success, error }), [success, error])

  return (
    <ToastContext.Provider value={api}>
      <Toast ref={ref} position="bottom-right" />
      {children}
    </ToastContext.Provider>
  )
}

/** Fora do provider o toast vira no-op: nenhuma tela quebra por falta de shell. */
// eslint-disable-next-line react-refresh/only-export-components -- hook do mesmo módulo do provider (padrão de contexto)
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { success: () => {}, error: () => {} }
}
