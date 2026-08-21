import { AppButton } from '../AppButton'
import { dangerText } from '../../styles/tokens'
import { useRetryPending } from './useRetryPending'

export interface AppErrorStateProps {
  title: string
  /** `detail` do RFC 7807, ou dica genérica quando o problema não trouxe um.
   * Erro nunca é só cor nem só ícone — o texto é obrigatório (peso legal). */
  detail?: string | null
  /** Ausente => sem botão. Uma lista que não recarrega sozinha não deve
   * prometer que recarrega. */
  retryLabel?: string
  /** Devolver a promise do refetch faz o botão esperar por ela. Handler que
   * devolve `void` continua funcionando — só fica sem feedback, e isso está
   * declarado na spec §7.1 como limitação, não como bug. */
  onRetry?: () => void | Promise<unknown>
}

/**
 * Estado de falha de carregamento. Apresentacional puro.
 *
 * Separado do `AppEmptyState` de propósito: vazio convida a criar, falha convida
 * a reintentar. Um GET quebrado que rende "cadastre o primeiro" faz a tela
 * afirmar algo falso sobre o banco.
 *
 * O tom vem da mesma fórmula do `AppCard` (`color-mix` com `--text-color`), que
 * é o que mantém contraste nos dois temas — os palette vars do Lara não invertem.
 */
export function AppErrorState({ title, detail, retryLabel, onRetry }: AppErrorStateProps) {
  const retry = useRetryPending(onRetry)

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <i className="pi pi-exclamation-triangle text-3xl" style={{ color: dangerText }} aria-hidden="true" />
      <p className="text-base font-semibold" style={{ color: dangerText }}>{title}</p>
      {detail && (
        <p className="max-w-md text-sm" style={{ color: 'var(--text-color-secondary)' }}>{detail}</p>
      )}
      {retryLabel && onRetry && (
        <div className="mt-1">
          <AppButton
            label={retryLabel}
            icon="pi pi-refresh"
            outlined
            loading={retry.pending}
            disabled={retry.pending}
            onClick={retry.run}
          />
        </div>
      )}
    </div>
  )
}
