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
  /** Ausente => a linha explica e não oferece botão. Existe porque repetir NEM
   * SEMPRE é recuperação: numa recusa de validação (422) o "Reintentar" reemite
   * a mesma requisição e recebe a mesma recusa, e a correção está no controle ao
   * lado, que a própria mensagem já indica (UI-05 da revisão de 2026-08-17). */
  onRetry?: () => void
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
 *
 * O botão fica JUNTO da mensagem, não na ponta oposta da linha: sob um campo de
 * formulário o `justify-between` era invisível, mas sob um controle de largura de
 * seção ele afastava a solução do problema em 1075px numa viewport de 1440
 * (UI-05 da revisão de 2026-08-17).
 */
export function InlineLoadState({ error, emptyHint, retryLabel, onRetry }: InlineLoadStateProps) {
  if (!error && !emptyHint) return null

  return (
    <>
      {error && (
        <p role="alert" className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: dangerText }}>
          <span>{error}</span>
          {onRetry && <AppButton label={retryLabel} text onClick={onRetry} />}
        </p>
      )}
      {emptyHint && (
        <p
          className="mt-1 flex flex-wrap items-center gap-2 text-xs"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          <span>{emptyHint}</span>
          {onRetry && <AppButton label={retryLabel} text onClick={onRetry} />}
        </p>
      )}
    </>
  )
}
