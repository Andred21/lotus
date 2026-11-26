import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Leva o foco ao `<main>` quando o `pathname` muda: numa SPA a troca de rota não
 * recarrega a página, e sem isto o leitor de tela segue no link clicado e o
 * teclado volta ao topo do shell.
 *
 * Nunca na montagem: o primeiro carregamento deixa o foco onde o navegador o
 * pôs (roubá-lo atrapalharia o `Saltar al contenido` e um campo com autofoco).
 * Só o `pathname` conta — `?tab=` e `?q=` não são navegação de página.
 */
export function useRouteFocus(ref: RefObject<HTMLElement | null>): void {
  const { pathname } = useLocation()
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    ref.current?.focus({ preventScroll: true })
  }, [pathname, ref])
}
