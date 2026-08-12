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

// Controles em cima da navy fixa do shell (sidebar e header). Estas duas
// superfícies não acompanham o swap de tema, então o controle em cima delas
// também não pode: com o `brandOutline`, no claro, `--surface-card` é branco e
// o botão vira uma caixa branca colada na navy. Aqui o fundo é o próprio navy,
// o traço é um véu de branco e o rótulo é branco (15,5:1 sobre a navy).
//
// O hover é `enabled:hover:` e não `hover:` por especificidade, não por gosto:
// o Lara traz `.p-button:enabled:hover` (0,3,0), que ganha de um `hover:`
// simples (0,2,0). Empatando em 0,3,0, quem vem depois no bundle vence — e o
// bundle do Vite vem depois do <link> do tema (D-P13).
const onNavySurface =
  'bg-transparent text-white border border-white/25 ' +
  'enabled:hover:bg-white/10 enabled:hover:text-white enabled:hover:border-white/40'

export const appButtonStyles = {
  /** Marca, com rótulo (ex.: seletor de idioma "EN"). */
  brandLabel: `flex items-center gap-1 px-3 py-2.5 text-sm ${brandOutline}`,
  /** Marca, só-ícone (toggles: tema, colapso da sidebar). */
  brandIcon: `flex items-center justify-center ${brandOutline}`,
  /** Sobre a navy, com rótulo (seletor de idioma no header). */
  onNavyLabel: `flex items-center gap-1 px-2.5 py-1.5 text-sm ${onNavySurface}`,
  /** Sobre a navy, só-ícone (toggle de tema, colapso da sidebar). */
  onNavyIcon: `flex items-center justify-center p-2 ${onNavySurface}`,
  /** Sobre a navy, sem traço — divulgação presa ao vizinho (chevron do usuário). */
  onNavyPlain:
    'flex items-center justify-center border-0 bg-transparent p-2 text-white ' +
    'enabled:hover:bg-white/10 enabled:hover:text-white',
} as const

export type AppButtonVariant = keyof typeof appButtonStyles
