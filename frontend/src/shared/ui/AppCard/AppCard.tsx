import type { CSSProperties, ReactNode } from 'react'
import { dangerText, infoText, neutralInk, successText, warningText } from '../../styles/tokens'

export type AppCardVariant = 'default' | 'stat'
export type AppCardTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface AppCardProps {
  variant?: AppCardVariant
  /** Tinge fundo e borda na variante `default`. Em `variant="stat"` o tom sai
   * do fundo e do texto e vira TRILHO na borda de início. */
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
  info: infoText,
  success: successText,
  warning: warningText,
  danger: dangerText,
}

/** Trilho do `stat`. Difere do `TONE_TEXT` só no neutro: como texto, neutro é a
 * tinta do corpo; como traço, a tinta do corpo seria o mais escuro da fileira e
 * leria como o mais urgente. */
const TONE_RAIL: Record<AppCardTone, string> = { ...TONE_TEXT, neutral: neutralInk }

/**
 * Container de conteúdo. Apresentacional puro — não conhece feature nem rota.
 * Compõe-se com AppCardHeader/AppCardToolbar/AppCardFooter; nenhum deles é
 * obrigatório, e a ordem é responsabilidade de quem compõe.
 *
 * `tone` e `variant` são ortogonais: o tom escolhe a cor, a variante escolhe a
 * forma. Um card de alerta é `tone="info"` sem variante; um card de estatística
 * é `variant="stat"` com o tom que o número pedir.
 *
 * **Onde o tom pousa muda com a variante.** Em `default` ele tinge fundo e
 * borda. Em `stat` ele vira um trilho de 3px na borda de início, e o conteúdo
 * fica em `--text-color` sobre `--surface-card` — cor de sinal em traço, texto
 * em contraste cheio. O desenho anterior tingia fundo E número: o número em
 * aviso media 2,86:1 no tema claro (abaixo até do 3,0:1 de texto grande) e o
 * rótulo secundário sobre o fundo tingido caía a 4,28–4,41:1 nos quatro tons
 * (UI-04 do review de 2026-08-17). Como traço, o mesmo tom só precisa de 3:1 e
 * entrega 4,6–7,4:1; como texto, o número passou de 2,86 para 10,35:1.
 *
 * Publica `--app-card-tone-text` aos descendentes para que os subcomponentes
 * acompanhem o tom sem recebê-lo por prop.
 */
export function AppCard({ variant = 'default', tone = 'neutral', className, children }: AppCardProps) {
  const hue = TONE_HUE[tone]
  const stat = variant === 'stat'

  const style: CSSProperties = {
    background: hue && !stat ? `color-mix(in srgb, ${hue} 8%, var(--surface-card))` : 'var(--surface-card)',
    borderColor: hue && !stat ? `color-mix(in srgb, ${hue} 35%, var(--surface-border))` : 'var(--surface-border)',
    color: 'var(--text-color)',
    ...(stat ? { borderInlineStartWidth: '3px', borderInlineStartColor: TONE_RAIL[tone] } : null),
    ['--app-card-tone-text' as string]: TONE_TEXT[tone],
  }

  return (
    <div
      className={[
        'rounded-lg border overflow-hidden',
        // O projeto não carrega o Preflight (`index.css:1-9`), então todo `p`
        // aqui dentro herda `margin: 1em` do agente do usuário — proporcional à
        // fonte, o que dava 30px acima e abaixo do número do KPI e 75–95px de
        // área morta por card (UI-02 do mesmo review). O card de estatística é
        // texto curto e conhecido: zerar aqui é mais barato e mais confiável do
        // que repetir `m-0` em cada call site, e não reintroduz o reset global
        // que a decisão do `index.css` recusou.
        stat ? 'px-4 py-3.5 [&_p]:m-0' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
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
 * contraste por tom nos dois temas.
 *
 * O `m-0` do título é a mesma correção do `[&_p]:m-0` do `AppCard`: sem
 * Preflight, o `h3` carrega `margin: 1em` do agente do usuário e a faixa media
 * 80px de altura para 24px de texto, em TODO card da aplicação. Zerado, ela
 * passa a valer o `py-3` que o markup declara.
 *
 * A faixa QUEBRA quando os dois lados não cabem. Em linha única a ação era
 * empurrada para fora do card e da viewport: em 390px o "Ir a Mi Perfil" do card
 * de pendências do Redator ia de x=279 a x=413 com a tela em 390, e o `<main>`
 * não tinha rolagem horizontal que alcançasse o pedaço cortado (UI-02 da revisão
 * de 2026-08-17). Quebrar preserva o rótulo inteiro; truncar o título, não —
 * título de card é o que identifica o bloco. */
export function AppCardHeader({ title, count, actions }: AppCardHeaderProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      {/* `min-w-0` para o grupo do título poder encolher até o min-content e
        * deixar a ação decidir se cabe: sem ele o grupo trava na largura do
        * texto inteiro e não há quebra que aconteça. */}
      <div className="flex min-w-0 items-center gap-2">
        <h3
          className="m-0 text-base font-semibold"
          style={{ color: 'var(--app-card-tone-text, var(--text-color))' }}
        >
          {title}
        </h3>
        {count !== undefined && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
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
  if (!start && !end) return null
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
