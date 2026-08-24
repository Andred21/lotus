/**
 * As abas do detalhe da turma, NOMEADAS — e a ordem deste array É a ordem dos
 * `AppTabPanel` na `TurmaDetailPage`.
 *
 * O `activeIndex` do TabView é número, e número solto não sobrevive a inserir
 * uma aba no meio: quem manda o redator para a documentação passaria a apontar
 * para outro painel sem nada reprovar. Foi por um número solto (`useState(0)`)
 * que o link da pendência prometia "Documentación" e entregava "Configuración"
 * (Q-1 do review de 2026-08-24).
 *
 * O nome viaja na URL (`?tab=docs`) e não no `state` do `<Link>`: assim o
 * destino sobrevive a recarga, a colar o endereço noutra janela e ao "voltar" do
 * navegador — e o que a tela mostra passa a ser verificável na barra de
 * endereço, que é o que um relatório de auditoria consegue afirmar.
 */
export const TURMA_TABS = ['config', 'students', 'redator', 'docs', 'conclusion'] as const

export type TurmaTab = (typeof TURMA_TABS)[number]

/** Índice do painel a partir do nome. Nome ausente ou desconhecido cai na
 * primeira aba — URL adulterada abre a tela, não a quebra. */
export function turmaTabIndex(tab: string | null | undefined): number {
  const index = TURMA_TABS.indexOf(tab as TurmaTab)
  return index === -1 ? 0 : index
}

/** Nome do painel a partir do índice — o caminho de volta, para escrever a URL
 * quando o usuário troca de aba. */
export function turmaTabName(index: number): TurmaTab {
  return TURMA_TABS[index] ?? TURMA_TABS[0]
}

/** Rota do detalhe já apontando para uma aba. Tipado no `tab`: apontar para uma
 * aba que não existe não compila. */
export function turmaTabPath(turmaId: number, tab: TurmaTab): string {
  return `/operacion/turmas/${turmaId}?tab=${tab}`
}
