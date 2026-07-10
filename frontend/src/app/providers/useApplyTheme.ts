import { useEffect } from 'react'
import { applyPrimeTheme } from '@shared/config/primeTheme'
import { useUiStore } from './uiStore'

/**
 * Aplica o tema globalmente: alterna a classe `dark` no <html> (Tailwind) e
 * troca a folha de tema do PrimeReact (ADR-16). Vive nos providers para valer em
 * TODAS as rotas — inclusive a de login, que fica fora do AppLayout.
 */
export function useApplyTheme(): void {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    applyPrimeTheme(theme)
  }, [theme])
}
