import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { ToastContext, type ToastApi } from '@shared/hooks'
import { AppToast, type AppToastHandle } from '@shared/ui'

/** Toast global da SPA: monta a superfície visual (`AppToast`) e entrega às
 * telas o contexto que `useToast()` lê. Mora em `app/` porque é composição das
 * duas camadas — `shared/ui` desenha, `shared/hooks` guarda o contexto. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const surface = useRef<AppToastHandle>(null)
  const api = useMemo<ToastApi>(
    () => ({
      success: (detail) => surface.current?.success(detail),
      error: (detail) => surface.current?.error(detail),
    }),
    [],
  )

  return (
    <ToastContext value={api}>
      <AppToast ref={surface} />
      {children}
    </ToastContext>
  )
}
