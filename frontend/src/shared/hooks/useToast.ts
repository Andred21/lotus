import { createContext, useContext } from 'react'

export type ToastApi = {
  success: (detail: string) => void
  error: (detail: string) => void
}

/** O contexto do toast global. Mora em `shared/hooks`, e não ao lado do
 * componente visual, porque hook de `shared/` o consome (`useCrudForm`,
 * `useArchiveToasts`) e a seta aponta de `ui` para `hooks`, nunca ao contrário
 * (frontend-fsliced.md). Quem PROVÊ é o `ToastProvider` de `app/providers`;
 * quem DESENHA é o `AppToast` de `shared/ui`. */
export const ToastContext = createContext<ToastApi | null>(null)

const SEM_PROVIDER: ToastApi = { success: () => {}, error: () => {} }

/** Fora do provider o toast vira no-op: nenhuma tela quebra por falta de shell. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? SEM_PROVIDER
}
