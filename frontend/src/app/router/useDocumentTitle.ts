import { useEffect } from 'react'
import { useMatches } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { RouteHandle } from './routes'

const APP_NAME = 'Lotus'

/**
 * Escreve `<Página> · Lotus` em `document.title` a partir do `handle.titleKey`
 * do match MAIS profundo que declara um (o detalhe herda o título do módulo
 * sem repetir). Sem nenhum, volta a `Lotus` — o título da rota anterior não
 * pode ficar preso na aba.
 *
 * Lê `t` do hook, então a troca de idioma reescreve o título na hora.
 */
export function useDocumentTitle(): void {
  const { t } = useTranslation()
  const titleKey = useMatches()
    .map((m) => (m.handle as RouteHandle | undefined)?.titleKey)
    .findLast((key) => key !== undefined)

  useEffect(() => {
    document.title = titleKey ? `${t(titleKey)} · ${APP_NAME}` : APP_NAME
    // Ao sair do layout (logout, login), a aba volta ao nome do produto em vez de
    // carregar o título da última página protegida.
    return () => {
      document.title = APP_NAME
    }
  }, [t, titleKey])
}
