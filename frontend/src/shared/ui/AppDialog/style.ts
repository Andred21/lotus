import type { DialogPassThroughOptions } from 'primereact/dialog'

export type AppDialogSize = 'sm' | 'md' | 'lg'

/** O teto de cada tamanho (bloco 43, spec §4.1). `w-[95vw]` vale em tela
 * estreita e o teto a partir dela. Uma classe literal por tamanho, para o
 * Tailwind enxergá-la. O `lg` solta o teto quando maximizado: o
 * `.p-dialog-maximized` do Prime crava largura e altura cheias, não o
 * `max-width`, e o teto prenderia o maximizado em 64rem. */
const TETO: Record<AppDialogSize, string> = {
  sm: 'max-w-[32rem]',
  md: 'max-w-[48rem]',
  lg: 'max-w-[64rem] [&.p-dialog-maximized]:max-w-none',
}

/** Passthrough do Dialog (ADR-16): largura, a classe da moldura e o respiro do
 * footer. A pintura navy do header e do footer mora em `brand-theme.css`
 * (`.lotus-dialog`), porque alcança peças internas do Prime — ícones do header,
 * botões `text` do footer — que o `pt` do Dialog não nomeia. O `py-3` fica: o
 * Lara dá ao footer padding 0 em cima (ele nasce colado ao conteúdo), e numa
 * faixa de cor própria os botões encostariam na borda. */
export const appDialogPt = (size: AppDialogSize): DialogPassThroughOptions => ({
  root: { className: `lotus-dialog w-[95vw] ${TETO[size]}` },
  content: { className: 'bg-[var(--surface-card)] pt-2' },
  footer: { className: 'py-3' },
})
