// Estilos Tailwind nomeados do AppButton. Adicione novos aqui e selecione
// via prop `variant` no call site — mantém o JSX limpo e a estilização
// centralizada (fora da renderização).

// Visual de marca: contorno de marca sobre superfície no claro; preenchido no
// escuro. O anel de foco é o do tema (celeste no Lara-Lotus) somado ao outline
// da camada de marca — não zerar o anel: zerá-lo aqui deixou o foco de teclado
// invisível (UI-03 do review de 2026-08-11). A classe não é nomeada de
// propósito: o scanner do Tailwind lê comentário e emitiria a utility morta.
//
// No escuro o rótulo é navy, não branco: é celeste preenchido, e a D6 vale em
// qualquer superfície celeste (branco sobre ela mede 2,77:1). A borda branca
// fica — é traço decorativo, não texto (D-P10/D-P11).
//
// No claro o rótulo e a borda saem de `--brand-ink`, não de `--brand`: aqui o
// celeste é PRIMEIRO PLANO sobre a superfície branca do botão e media 2,77:1,
// reprovando os dois limiares aplicáveis (4,5:1 de texto e 3:1 de borda). É o
// mesmo 2,77:1 que o achado 3 matou no tema gerado e que sobreviveu nesta
// camada, porque ela é Tailwind e o transform do tema não a enxerga — UI-01 do
// review de 2026-08-12. O `hover` continua indo para `--text-color`.
const brandOutline =
  'bg-[var(--surface-card)] text-[var(--brand-ink)] border-2 border-[var(--brand-ink)] hover:text-[var(--text-color)] ' +
  'dark:bg-[var(--brand)] dark:border-2 dark:border-white dark:text-[var(--brand-navy)] dark:hover:text-[var(--surface-card)]'

export const appButtonStyles = {
  /** Marca, com rótulo (ex.: seletor de idioma "EN"). */
  brandLabel: `flex items-center gap-1 px-3 py-2.5 text-sm ${brandOutline}`,
  /** Marca, só-ícone (toggles: tema, colapso da sidebar). */
  brandIcon: `flex items-center justify-center ${brandOutline}`,
  /**
   * Sem superfície: fundo, padding e hover do `.p-button` zerados. É o gatilho
   * que embrulha avatar e identidade no header — ali quem pinta são os filhos,
   * e uma superfície própria desenharia uma segunda caixa em volta do bloco.
   *
   * Não é "botão invisível": o que sobra é justamente o que justifica ser um
   * <button> — área de clique única e ANEL DE FOCO em volta do bloco inteiro.
   * O anel não entra na conta de zerar nada; zerá-lo foi o UI-03 de 2026-08-11.
   *
   * Os `!` vieram verbatim do call site que este variant substitui (Q-4 do
   * review de 2026-08-12) — a exigência era resultado idêntico ao de hoje. Eles
   * não são prova de necessidade: o Prime inteiro (folha do tema e CSS injetado
   * em runtime) vive em `@layer primereact`, abaixo do layer das utilities.
   * Ficam como a marcação de override sobre raiz de componente Prime que o
   * shell já usa (`mx-0!` no Header); tirá-los é experimento visual à parte.
   */
  noSurface: 'bg-transparent! p-0! hover:bg-transparent!',
} as const

export type AppButtonVariant = keyof typeof appButtonStyles
