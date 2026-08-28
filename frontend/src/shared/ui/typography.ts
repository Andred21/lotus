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
