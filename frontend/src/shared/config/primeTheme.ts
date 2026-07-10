// Vite resolve `?url` para o caminho servido (dev) ou para o asset emitido (build).
import lightThemeUrl from 'primereact/resources/themes/lara-light-blue/theme.css?url'
import darkThemeUrl from 'primereact/resources/themes/lara-dark-blue/theme.css?url'

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
