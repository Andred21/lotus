// Estilos Tailwind nomeados do AppButton. Adicione novos aqui e selecione
// via prop `variant` no call site — mantém o JSX limpo e a estilização
// centralizada (fora da renderização).

// Visual de marca: contorno #25A5E4 sobre branco no claro; preenchido no escuro.
const brandOutline =
  'bg-white text-[#25A5E4] border-2 border-[#25A5E4] ring-0 hover:text-slate-700 ' +
  'dark:bg-[#25A5E4] dark:border-2 dark:border-white dark:text-white dark:hover:text-slate-300'

export const appButtonStyles = {
  /** Marca, com rótulo (ex.: seletor de idioma "EN"). */
  brandLabel: `flex items-center gap-1 px-3 py-2.5 text-sm ${brandOutline}`,
  /** Marca, só-ícone (toggles: tema, colapso da sidebar). */
  brandIcon: `flex items-center justify-center ${brandOutline}`,
} as const

export type AppButtonVariant = keyof typeof appButtonStyles
