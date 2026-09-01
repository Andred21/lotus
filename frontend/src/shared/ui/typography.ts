/**
 * Grafia tipográfica por PAPEL.
 *
 * Arquivo plano, e não pasta: as pastas deste barrel são pasta-por-COMPONENTE,
 * e isto deliberadamente não é componente — é a grafia que se aplica a um
 * elemento que JÁ tem dono (`h1` do `PageHeader`, `dt` da validação). Mesmo
 * critério do `archivedColumns.tsx`.
 *
 * Quando o papel tem markup próprio — faixa com hairline, número com rótulo,
 * folio com legenda — a peça é componente, não constante daqui (spec D2).
 *
 * Não há cor nenhuma aqui: cor vem de variável do tema por `style` (ADR-16), e
 * quem compõe é quem sabe sobre que superfície o texto pousa.
 */

/**
 * Título de página. Era a grafia do `PageHeader`; o `DetailHeader` pagava
 * `text-2xl font-bold` e os 5 sítios de auth carregavam a mesma frase copiada
 * literal (achados A1 e A5 do audit de 2026-08-26).
 */
export const pageTitleClass = 'font-display text-2xl font-semibold tracking-tight'

/**
 * Faixa que encabeça um grupo. Era a grafia do `SectionLabel` do Dashboard, e o
 * mesmo papel saía em 5 grafias diferentes pelo produto (achado A2).
 */
export const sectionLabelClass = 'text-xs font-semibold tracking-wider uppercase'

/**
 * Rótulo de CAMPO — o `<dt>` de uma lista de definição. Peça diferente da faixa
 * de seção (spec D5): não encabeça grupo, não é heading, não carrega peso.
 */
export const fieldLabelClass = 'text-xs uppercase tracking-wide'

/**
 * Número de estatística. Dois degraus: `page` para o KPI que é o assunto da
 * dobra, `card` para o número dentro de um cartão que já tem outro assunto.
 *
 * `tabular-nums` nos dois, sem exceção: sem ele o dígito muda de largura entre
 * renders e o número dança na coluna — era o caso do UF do `BudgetStatCard`
 * (achado A3).
 */
export const statValueClass = (size: 'page' | 'card'): string =>
  size === 'page'
    ? 'font-display text-3xl leading-none font-semibold tabular-nums'
    : 'font-display text-2xl font-semibold tabular-nums'

/**
 * Dado técnico — contagem que alinha em coluna, data, versão. `font-mono` sem
 * `tabular-nums` é o que a fase 2 do item 18 mediu em sete sítios: em IBM Plex
 * Mono a diferença não aparece enquanto a fonte carrega, e a declaração é a
 * garantia contra o fallback. O par é inseparável, e por isso é uma constante.
 * Mecanismo: `MONO_LITERAL` em `frontend/eslint.config.js`.
 */
export const technicalDataClass = 'font-mono tabular-nums'

/**
 * Título de CARD. Estava literal em `AppCard.tsx`, e a `D-63` perguntou se ele
 * e a faixa de seção não seriam dois degraus da mesma escala. Não são: são dois
 * REGISTROS — a faixa codifica profundidade por CAIXA e posição (12px, caixa
 * alta, tracking aberto), o título por CORPO (16px, caixa mista). Monotonizar
 * os dois apagaria o registro eyebrow em toda tela que o usa, e reabriria a
 * grafia do `SectionLabel`, que o item 18 acabou de unificar a partir de cinco.
 *
 * A constante existe para o degrau poder mudar DEPOIS sem varrer sítios — que
 * é o que faltava quando ele morava literal num `h3`.
 */
export const cardTitleClass = 'text-base font-semibold'

/**
 * Veredito da validação pública — o `h1` de `/validar`. Estava em `text-lg`
 * (18px) ao lado de um folio de 30px: numa página pública de peso legal o
 * veredito saía um degrau abaixo do identificador (D-63, 2026-08-31, medido
 * nas três viewports). Não é `pageTitleClass` — aquele é 24px com
 * `tracking-tight`, degrau que ainda perderia do folio; este sobe até o MESMO
 * degrau (`text-3xl`, 30px).
 */
export const validationVerdictClass = 'font-display text-3xl font-semibold'

/**
 * Identificador — RUT, folio, código: dado técnico que é TOKEN ÚNICO e não
 * quebra. O hífen do dígito verificador é oportunidade de quebra para o
 * navegador: a fase 1 mediu "76.123.456-" / "0" no cabeçalho do presupuesto a
 * 1024px. Identificador partido é copiado errado e conferido errado.
 */
export const identifierClass = `${technicalDataClass} whitespace-nowrap`
