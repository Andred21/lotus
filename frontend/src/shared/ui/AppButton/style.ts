// Estilos Tailwind nomeados do AppButton. Adicione novos aqui e selecione
// via prop `variant` no call site — mantém o JSX limpo e a estilização
// centralizada (fora da renderização).

// Visual de marca: contorno celeste sobre superfície no claro; preenchido no
// escuro. O anel de foco é o do tema (celeste no Lara-Lotus) somado ao outline
// da camada de marca — não zerar o anel: zerá-lo aqui deixou o foco de teclado
// invisível (UI-03 do review de 2026-08-11). A classe não é nomeada de
// propósito: o scanner do Tailwind lê comentário e emitiria a utility morta.
//
// No escuro o rótulo é navy, não branco: é celeste preenchido, e a D6 vale em
// qualquer superfície celeste (branco sobre ela mede 2,77:1). A borda branca
// fica — é traço decorativo, não texto (D-P10/D-P11).
const brandOutline =
  'bg-[var(--surface-card)] text-[var(--brand)] border-2 border-[var(--brand)] hover:text-[var(--text-color)] ' +
  'dark:bg-[var(--brand)] dark:border-2 dark:border-white dark:text-[var(--brand-navy)] dark:hover:text-[var(--surface-card)]'

export const appButtonStyles = {
  /** Marca, com rótulo (ex.: seletor de idioma "EN"). */
  brandLabel: `flex items-center gap-1 px-3 py-2.5 text-sm ${brandOutline}`,
  /** Marca, só-ícone (toggles: tema, colapso da sidebar). */
  brandIcon: `flex items-center justify-center ${brandOutline}`,
} as const

export type AppButtonVariant = keyof typeof appButtonStyles
