import { useEffect, useRef, useState } from 'react'
import { useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppErrorState, AppIcon } from '@shared/ui'
import { claimChunkReload } from './chunkReload'

/**
 * Falha de chunk quase sempre é deploy novo: o `index.html` aberto na aba aponta
 * para arquivos com hash que o servidor já não tem. Recarregar pega o `index.html`
 * novo. A recarga é UMA, e só se a marca puder ser gravada: com a marca já lá, ou sem
 * storage para guardá-la, o erro vira tela, em vez de laço.
 */
export function RouteError() {
  const error = useRouteError()
  const { t } = useTranslation()
  const [reloading] = useState(() => claimChunkReload(error))
  const done = useRef(false)

  useEffect(() => {
    if (!reloading || done.current) return
    done.current = true
    window.location.reload()
  }, [reloading])

  if (reloading) return null

  return (
    <AppErrorState
      title={t('common.loadError')}
      detail={t('common.loadErrorHint')}
      retryLabel={t('common.retry')}
      onRetry={() => window.location.reload()}
    />
  )
}

/** Enquanto o chunk da PRIMEIRA página do carregamento não chega, o router ainda não
 * inicializou e não há nada a mostrar; sem um fallback ele rende `null` e avisa. */
export function PageFallback() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-label={t('common.loading')} className="flex min-h-40 items-center justify-center">
      <AppIcon name="spinner" className="animate-spin size-[1.875rem]" />
    </div>
  )
}
