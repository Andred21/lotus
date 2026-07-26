import type { ReactNode } from 'react'

export interface AppEmptyStateProps {
  /** Classe de ícone do PrimeIcons. Default: 'pi pi-inbox'. */
  icon?: string
  title: string
  description?: string
  /** Botão de ação. Ausente quando não há ação sensata a oferecer. */
  action?: ReactNode
}

/**
 * Estado vazio de tabela ou lista. Dois usos, distinguidos por quem chama:
 * sem dado (convida a criar) e busca sem resultado (oferece limpar o filtro).
 * Sugerir cadastro quando o problema é o filtro manda o usuário para o lugar
 * errado, por isso a distinção é do chamador e não deste componente.
 */
export function AppEmptyState({ icon = 'pi pi-inbox', title, description, action }: AppEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <i className={`${icon} text-3xl`} style={{ color: 'var(--text-color-secondary)' }} aria-hidden="true" />
      <p className="text-base font-semibold" style={{ color: 'var(--text-color)' }}>{title}</p>
      {description && (
        <p className="max-w-md text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
