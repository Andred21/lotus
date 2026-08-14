import { AppButton } from '../AppButton'
import { dangerText } from '../../styles/tokens'

export interface InlineLoadStateProps {
  /** Motivo da falha do GET (o `detail` do RFC 7807, ou a dica genérica).
   * Ausente => sem ramo de falha. */
  error?: string | null
  /** Lista que carregou e veio vazia de verdade. Ausente => sem ramo de dica.
   * Distinto de `error` de propósito: vazio convida a cadastrar, falha convida
   * a reintentar, e trocar um pelo outro faz a tela mentir. */
  emptyHint?: string | null
  retryLabel: string
  onRetry: () => void
}

/**
 * Linha compacta sob um controle que CONTINUA utilizável: por que a lista dele
 * não veio, ou por que ela está vazia, com Reintentar em qualquer dos casos.
 *
 * Distinto do `AppErrorState`, que é o bloco centrado de uma tela ou lista
 * inteira em falha. Aqui o dropdown segue montado e as linhas seguem visíveis —
 * a falha explica o que falta, não substitui o que veio (spec BD-6 D2/D5).
 *
 * Só a falha carrega `role="alert"`: lista vazia não é anomalia a interromper
 * leitura de tela.
 */
export function InlineLoadState({ error, emptyHint, retryLabel, onRetry }: InlineLoadStateProps) {
  if (!error && !emptyHint) return null

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mt-1 flex items-center justify-between gap-2 text-xs"
          style={{ color: dangerText }}
        >
          <span>{error}</span>
          <AppButton label={retryLabel} text onClick={onRetry} />
        </p>
      )}
      {emptyHint && (
        <p
          className="mt-1 flex items-center justify-between gap-2 text-xs"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          <span>{emptyHint}</span>
          <AppButton label={retryLabel} text onClick={onRetry} />
        </p>
      )}
    </>
  )
}
