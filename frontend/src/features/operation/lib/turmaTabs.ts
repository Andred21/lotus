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

/** Rota do detalhe já apontando para uma aba. Tipado no `tab`: apontar para uma
 * aba que não existe não compila. */
export function turmaTabPath(turmaId: number, tab: TurmaTab): string {
  return `/operacion/turmas/${turmaId}?tab=${tab}`
}
