import type { CSSProperties, ReactNode } from 'react'
import { dangerText, infoText, neutralInk, successText, warningText } from '../../styles/tokens'
import { technicalDataClass } from '../typography'

export type AppCardVariant = 'default' | 'stat' | 'sunken'
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
 * **`sunken` marca superfície RECUADA, e é a terceira variante.** Ela põe o
 * cartão em `--surface-ground` — o mesmo fundo que o `AppLayout` já pinta —, com
 * a borda na cor do fundo em vez de `border: none`, para que o anel suma sem
 * mexer no box model. Serve ao corte por mutabilidade de `/perfil` (D-28): a
 * única ideia estrutural daquela tela era expressa só por posição horizontal,
 * que existe a partir de 1280px, e abaixo disso virava ordem vertical — ordem
 * sem marca não lê como regra. Recuada, a coluna de leitura se dissolve no fundo
 * e sobra cartão só onde há o que fazer. A mecânica tem precedente: o
 * `PipelineFunnel` já usa `--surface-ground` como sulco dentro de um cartão.
 * Como o `stat`, ela decide a SUPERFÍCIE e deixa o `tone` decidir o acento; ao
 * contrário do `stat`, não traz padding acoplado.
 *
 * Publica `--app-card-tone-text` aos descendentes para que os subcomponentes
 * acompanhem o tom sem recebê-lo por prop.
 */
export function AppCard({ variant = 'default', tone = 'neutral', className, children }: AppCardProps) {
  const hue = TONE_HUE[tone]
  const stat = variant === 'stat'
  const sunken = variant === 'sunken'
  const tingido = hue && !stat && !sunken

  const style: CSSProperties = {
    background: sunken ? 'var(--surface-ground)' : tingido ? `color-mix(in srgb, ${hue} 8%, var(--surface-card))` : 'var(--surface-card)',
    borderColor: sunken ? 'var(--surface-ground)' : tingido ? `color-mix(in srgb, ${hue} 35%, var(--surface-border))` : 'var(--surface-border)',
    color: 'var(--text-color)',
    ...(stat ? { borderInlineStartWidth: '3px', borderInlineStartColor: TONE_RAIL[tone] } : null),
    ['--app-card-tone-text' as string]: TONE_TEXT[tone],
  }

  return (
    <div
      className={[
        'rounded-surface border overflow-hidden',
        // A margem do `p` já é zerada pelo mini-reset de `index.css` (P-46).
        stat ? 'px-4 py-3.5' : '',
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
  /** Qualificador do título, em tinta secundária, ao lado dele — e na linha de
   * baixo quando não couber. É a grandeza que o card mostra quando ela é
   * escolhida FORA dele. Sem isso os dois cards
   * de ranking mantinham o mesmo título enquanto o eixo saltava de 0–4 para
   * 0–340, e o seletor que explicava a mudança ficava fora do campo de visão
   * assim que a página rolava (UI-05 da revisão de 2026-08-22). Não é lugar de
   * descrição: qualificador, não legenda. */
  subtitle?: ReactNode
  /** Ação secundária, alinhada à direita. */
  actions?: ReactNode
}

/** Cabeçalho de card: título (+ badge de contagem) à esquerda, ação à direita.
 * O título acompanha o tom do card pela var publicada pelo `AppCard`; o badge
 * fica neutro de propósito, para não precisar de uma segunda escala de
 * contraste por tom nos dois temas.
 *
 * A margem do título já é zerada pelo mini-reset de `index.css` (P-46), o que
 * deixa a faixa valer o `py-3` que o markup declara.
 *
 * A faixa QUEBRA quando os dois lados não cabem. Em linha única a ação era
 * empurrada para fora do card e da viewport: em 390px o "Ir a Mi Perfil" do card
 * de pendências do Redator ia de x=279 a x=413 com a tela em 390, e o `<main>`
 * não tinha rolagem horizontal que alcançasse o pedaço cortado (UI-02 da revisão
 * de 2026-08-17). Quebrar preserva o rótulo inteiro; truncar o título, não —
 * título de card é o que identifica o bloco. */
export function AppCardHeader({ title, count, subtitle, actions }: AppCardHeaderProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      {/* `min-w-0` para o grupo do título poder encolher até o min-content e
        * deixar a ação decidir se cabe: sem ele o grupo trava na largura do
        * texto inteiro e não há quebra que aconteça. `flex-wrap` para o
        * qualificador descer uma linha quando a faixa aperta, em vez de virar
        * reticências: num card de 300px o título de duas linhas já come a
        * largura toda, e "Cla…" no lugar de "Clases" não qualifica nada. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--app-card-tone-text, var(--text-color))' }}
        >
          {title}
        </h3>
        {count !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${technicalDataClass}`}
            style={{ background: 'var(--surface-section)', color: 'var(--text-color-secondary)' }}
          >
            {count}
          </span>
        )}
        {subtitle !== undefined && (
          <span className="text-xs font-medium" style={{ color: 'var(--text-color-secondary)' }}>
            {subtitle}
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

/** Linha de controles do card. Empilha em telas estreitas (H.2.1).
 *
 * O slot `end` quebra linha (`flex-wrap`) e NÃO é `shrink-0`, diferente do slot
 * de ações do `AppCardHeader` acima: aqui ele carrega o alternador
 * arquivados + a ação primária do módulo, e em 390x844 os dois lado a lado não
 * cabiam. Com `shrink-0` no invólucro, quem cedia era o botão — o "Nuevo
 * presupuesto" media 44px, vazava 36px do próprio slot e 3px da viewport, com o
 * rótulo ilegível (UI-01 da run de Comercial, 2026-08-25). Deixando o slot
 * quebrar, a ação desce uma linha inteira e continua legível.
 *
 * `justify-end` para a ação primária continuar à direita quando ela é a única
 * da linha, que é como ela lê em telas largas. */
export function AppCardToolbar({ start, end }: AppCardToolbarProps) {
  if (!start && !end) return null
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">{start}</div>
      {end && <div className="flex flex-wrap items-center justify-end gap-2">{end}</div>}
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
