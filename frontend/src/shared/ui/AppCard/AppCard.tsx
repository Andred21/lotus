import type { CSSProperties, ReactNode } from 'react'

export type AppCardVariant = 'default' | 'stat'
export type AppCardTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface AppCardProps {
  variant?: AppCardVariant
  /** Tinge fundo e borda em qualquer variante. Em `variant="stat"` tinge
   * também o texto — lá o número É o sinal semântico. */
  tone?: AppCardTone
  className?: string
  children: ReactNode
}

/** Hue por tom. Os palette vars do Lara NÃO invertem entre temas, então o fundo
 * tingido é composto com --surface-card (que inverte) via color-mix. */
const TONE_HUE: Record<AppCardTone, string | null> = {
  neutral: null,
  info: 'var(--blue-500)',
  success: 'var(--green-500)',
  warning: 'var(--yellow-500)',
  danger: 'var(--red-500)',
}

const TONE_TEXT: Record<AppCardTone, string> = {
  neutral: 'var(--text-color)',
  info: 'color-mix(in srgb, var(--blue-500) 70%, var(--text-color))',
  success: 'color-mix(in srgb, var(--green-500) 70%, var(--text-color))',
  warning: 'color-mix(in srgb, var(--yellow-500) 70%, var(--text-color))',
  danger: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))',
}

/**
 * Container de conteúdo. Apresentacional puro — não conhece feature nem rota.
 * Compõe-se com AppCardHeader/AppCardToolbar/AppCardFooter; nenhum deles é
 * obrigatório, e a ordem é responsabilidade de quem compõe.
 *
 * `tone` e `variant` são ortogonais: o tom escolhe a cor, a variante escolhe a
 * forma. Um card de alerta é `tone="info"` sem variante; um card de estatística
 * é `variant="stat"` com o tom que o número pedir.
 *
 * Publica `--app-card-tone-text` aos descendentes para que os subcomponentes
 * acompanhem o tom sem recebê-lo por prop.
 */
export function AppCard({ variant = 'default', tone = 'neutral', className, children }: AppCardProps) {
  const hue = TONE_HUE[tone]

  const style: CSSProperties = {
    background: hue ? `color-mix(in srgb, ${hue} 8%, var(--surface-card))` : 'var(--surface-card)',
    borderColor: hue ? `color-mix(in srgb, ${hue} 35%, var(--surface-border))` : 'var(--surface-border)',
    // O texto do container só segue o tom em `stat`: numa lista ou tabela,
    // tingir todo o corpo derruba o contraste em vez de sinalizar.
    color: variant === 'stat' ? TONE_TEXT[tone] : 'var(--text-color)',
    ['--app-card-tone-text' as string]: TONE_TEXT[tone],
  }

  return (
    <div
      className={['rounded-lg border overflow-hidden', variant === 'stat' ? 'px-5 py-4' : '', className].filter(Boolean).join(' ')}
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

/** Cabeçalho de card: título (+ badge de contagem) à esquerda, ação à direita.
 * O título acompanha o tom do card pela var publicada pelo `AppCard`; o badge
 * fica neutro de propósito, para não precisar de uma segunda escala de
 * contraste por tom nos dois temas. */
export function AppCardHeader({ title, count, actions }: AppCardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b px-4 py-3"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      <div className="flex items-center gap-2">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--app-card-tone-text, var(--text-color))' }}
        >
          {title}
        </h3>
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
   * Efetivamente sem uso hoje: nenhuma tabela renderiza `AppCardFooter` mais.
   * A unificação das duas faixas (corpo dono do paginador vs. este footer),
   * cogitada para a Parte 2 e adiada de novo, acabou resolvida na Parte 3 —
   * mas por outro mecanismo: o `footerCount` do `AppDataTable` faz o próprio
   * paginador do `DataTable` virar o rodapé do card (contagem à esquerda,
   * controles à direita), sem passar por este slot. `AppCardFooter` continua
   * no código para cards com rodapé que não têm tabela.
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
