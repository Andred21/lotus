import type { DataTablePassThroughOptions } from 'primereact/datatable'

/** Passthrough do DataTable (ADR-16). Cores por CSS var do tema Lara.
 *
 * Sem zebra por decisão do bloco visual: zebra e hover competem, e na linha já
 * tingida o hover fica ambíguo. Tabela com poucas colunas e borda de linha não
 * precisa de zebra para guiar o olho. */
export const appDataTablePt: DataTablePassThroughOptions = {
  root: { className: 'text-sm' },
  /** Responsividade (spec D20): quem rola é o card, nunca a página. A tabela
   * ganha largura mínima para as colunas não se espremerem a ponto de quebrar
   * palavra; abaixo disso o wrapper rola na horizontal.
   *
   * Colapsar coluna foi rejeitado: escolher qual dado some é julgamento de
   * domínio, e esconder coluna em tela com peso de auditoria é perda silenciosa.
   *
   * A rolagem SE ANUNCIA (UI-10 da revisão de 2026-08-17). Quatro camadas de
   * fundo, na ordem em que o CSS as pinta: duas CAPAS na cor do card, presas ao
   * CONTEÚDO (`local`), e atrás delas duas SOMBRAS presas à MOLDURA (`scroll`).
   * Com conteúdo fora da vista, a capa daquele lado já rolou para fora e a
   * sombra aparece; ao chegar ao fim da rolagem a capa volta e a cobre. Sem
   * listener de rolagem e sem nó novo no markup.
   *
   * A contraparte obrigatória mora na `brand-theme.css`: a linha do corpo do
   * Lara é branco OPACO e cobria estas camadas. */
  wrapper: {
    className: 'overflow-x-auto',
    style: {
      backgroundImage: [
        'linear-gradient(to right, var(--surface-card), transparent)',
        'linear-gradient(to left, var(--surface-card), transparent)',
        'linear-gradient(to right, color-mix(in srgb, var(--text-color) 22%, transparent), transparent)',
        'linear-gradient(to left, color-mix(in srgb, var(--text-color) 22%, transparent), transparent)',
      ].join(', '),
      backgroundPosition: 'left center, right center, left center, right center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '2.5rem 100%, 2.5rem 100%, 1rem 100%, 1rem 100%',
      backgroundAttachment: 'local, local, scroll, scroll',
    },
  },
  table: { className: 'min-w-[48rem]' },
  headerRow: { className: 'text-xs uppercase tracking-wide' },
  // headerCell/bodyCell pertencem a ColumnPassThroughOptions, não a
  // DataTablePassThroughOptions — cascatam via `column` (tipagem do PrimeReact 10.9.8).
  column: {
    headerCell: {
      className: 'px-4 py-2.5',
      style: { background: 'var(--surface-section)', color: 'var(--text-color-secondary)' },
    },
    bodyCell: { className: 'px-4 py-3' },
  },
  bodyRow: { className: 'transition-colors' },
}

/** Faixa de rodapé da tabela (spec D12): o paginador do DataTable É o rodapé —
 * contagem à esquerda em `paginatorLeft`, controles à direita, uma faixa só.
 *
 * Layout e cor inline porque o tema Lara já estiliza `.p-paginator` (fundo
 * branco, borda, padding, radius) e utility do Tailwind não vence a
 * especificidade dele. Reproduz o visual do `AppCardFooter`: borda em cima,
 * px-4 py-3, texto secundário. */
export const appPaginatorPt: NonNullable<DataTablePassThroughOptions['paginator']> = {
  root: {
    className: 'text-sm',
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '0.25rem',
      background: 'transparent',
      border: 'none',
      borderTop: '1px solid var(--surface-border)',
      borderRadius: 0,
      padding: '0.75rem 1rem',
      color: 'var(--text-color-secondary)',
    },
  },
  /** Empurra os controles para a direita sem depender do `justify-content`:
   * com uma página só, a contagem fica sozinha e continua à esquerda. */
  left: { style: { marginRight: 'auto' } },
}
