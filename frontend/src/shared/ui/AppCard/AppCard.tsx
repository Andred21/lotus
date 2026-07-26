import type { CSSProperties, ReactNode } from 'react'

export type AppCardVariant = 'default' | 'stat'
export type AppCardTone = 'neutral' | 'success' | 'danger'

export interface AppCardProps {
  variant?: AppCardVariant
  /** Só tem efeito com variant="stat". */
  tone?: AppCardTone
  className?: string
  children: ReactNode
}

/** Hue por tom. Os palette vars do Lara NÃO invertem entre temas, então o fundo
 * tingido é composto com --surface-card (que inverte) via color-mix. */
const TONE_HUE: Record<AppCardTone, string | null> = {
  neutral: null,
  success: 'var(--green-500)',
  danger: 'var(--red-500)',
}

const TONE_TEXT: Record<AppCardTone, string> = {
  neutral: 'var(--text-color)',
  success: 'var(--green-600)',
  danger: 'var(--red-600)',
}

/**
 * Container de conteúdo. Apresentacional puro — não conhece feature nem rota.
 * Compõe-se com AppCardHeader/AppCardToolbar/AppCardFooter; nenhum deles é
 * obrigatório, e a ordem é responsabilidade de quem compõe.
 */
export function AppCard({ variant = 'default', tone = 'neutral', className, children }: AppCardProps) {
  const hue = variant === 'stat' ? TONE_HUE[tone] : null

  const style: CSSProperties = {
    background: hue ? `color-mix(in srgb, ${hue} 8%, var(--surface-card))` : 'var(--surface-card)',
    borderColor: hue ? `color-mix(in srgb, ${hue} 35%, var(--surface-border))` : 'var(--surface-border)',
    color: variant === 'stat' ? TONE_TEXT[tone] : 'var(--text-color)',
  }

  return (
    <div
      className={['rounded-lg border', variant === 'stat' ? 'px-5 py-4' : '', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}

export interface AppCardHeaderProps {
  title: ReactNode
  /** Badge de contagem à direita do título. */
  count?: number
  /** Ação secundária, alinhada à direita. */
  actions?: ReactNode
}

/** Cabeçalho de card: título (+ badge de contagem) à esquerda, ação à direita. */
export function AppCardHeader({ title, count, actions }: AppCardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b px-4 py-3"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-color)' }}>{title}</h3>
        {count !== undefined && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: 'var(--surface-section)', color: 'var(--text-color-secondary)' }}
          >
            {count}
          </span>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export interface AppCardToolbarProps {
  /** Busca, filtros ou grupo de botões. */
  start?: ReactNode
  /** Ação primária ou contagem. */
  end?: ReactNode
}

/** Linha de controles do card. Empilha em telas estreitas (H.2.1). */
export function AppCardToolbar({ start, end }: AppCardToolbarProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">{start}</div>
      {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
    </div>
  )
}

export interface AppCardFooterProps {
  /** Contagem em prosa. */
  count: ReactNode
  /**
   * Paginação, quando houver mais de uma página.
   *
   * ATENÇÃO — pendência conhecida da Parte 1: o `DataTable` do PrimeReact é dono
   * do estado de página e renderiza o próprio paginador logo abaixo do corpo da
   * tabela, ou seja ACIMA deste footer. Com as duas coisas ligadas aparecem duas
   * faixas, e o protótipo mostra uma. Em Comercial o caso não ocorre (o seeder
   * cria 4 clientes e 6 orçamentos, abaixo do `rows={10}`), então a Parte 1
   * entrega o footer só com contagem. Unificar as duas faixas — via
   * `paginatorTemplate` do `DataTable` alimentando este slot — é escopo da
   * Parte 2, onde Operación tem o caso real.
   */
  pagination?: ReactNode
}

/** Rodapé do card: contagem à esquerda, paginação à direita. */
export function AppCardFooter({ count, pagination }: AppCardFooterProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm"
      style={{ borderColor: 'var(--surface-border)', color: 'var(--text-color-secondary)' }}
    >
      <span>{count}</span>
      {pagination}
    </div>
  )
}
