import { useEffect } from 'react'
import { useUiStore } from './uiStore'

/**
 * Aplica o tema globalmente: alterna a classe `dark` no <html> conforme o
 * uiStore. Vive nos providers para valer em TODAS as rotas — inclusive a de
 * login, que fica fora do AppLayout.
 */
export function useApplyTheme(): void {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
}
