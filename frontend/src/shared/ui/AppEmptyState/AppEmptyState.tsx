import type { ReactNode } from 'react'
import { renderIcon, type IconProp } from '../AppIcon'

export interface AppEmptyStateProps {
  /** `IconName` do registro. Default: 'archive'. */
  icon?: IconProp
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
export function AppEmptyState({ icon = 'archive', title, description, action }: AppEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      {/* `size-[1.875rem]` vence os atributos width/height do svg e mantém os
        * 30px do `text-3xl` de antes (o `lg` do AppIcon pára em 24). */}
      <span className="inline-flex" style={{ color: 'var(--text-color-secondary)' }}>
        {renderIcon(icon, { className: 'size-[1.875rem] text-3xl' })}
      </span>
      <p className="text-base font-semibold" style={{ color: 'var(--text-color)' }}>{title}</p>
      {description && (
        <p className="max-w-md text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
