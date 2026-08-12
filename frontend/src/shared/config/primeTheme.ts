// Vite resolve `?url` para o caminho servido (dev) ou para o asset emitido (build).
// Temas GERADOS por scripts/generate-brand-theme.mjs sobre o Lara (ADR-16 §5,
// spec D5'). Não editar os arquivos: `pnpm brand-theme` regera e
// tests/brand-theme.test.ts acusa drift.
import lightThemeUrl from '../styles/themes/lara-light-lotus.css?url'
import darkThemeUrl from '../styles/themes/lara-dark-lotus.css?url'

const LINK_ID = 'prime-theme'

/**
 * Troca a folha de tema do PrimeReact (ADR-16). O <link> é inserido no TOPO do
 * <head> para que as utilities do Tailwind, injetadas depois, continuem vencendo
 * por ordem de cascata.
 */
export function applyPrimeTheme(theme: 'light' | 'dark'): void {
  const href = theme === 'dark' ? darkThemeUrl : lightThemeUrl

  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = LINK_ID
    link.rel = 'stylesheet'
    document.head.prepend(link)
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}
