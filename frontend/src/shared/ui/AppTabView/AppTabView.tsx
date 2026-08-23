import { TabView, TabPanel } from 'primereact/tabview'
import type { TabViewProps } from 'primereact/tabview'

export type { TabViewProps as AppTabViewProps } from 'primereact/tabview'

const appTabViewPt = {
  panelContainer: { className: 'p-0' },
}

export function AppTabView({ pt, scrollable, ...props }: TabViewProps) {
  // `scrollable` liga por PADRÃO: sem ela a régua de abas transborda sem seta,
  // sombra ou qualquer sinal de que há mais aba fora da tela, e em 390x844 três
  // das cinco abas da turma nasciam invisíveis (UI-06 da revisão de 2026-08-23).
  // Os botões prev/next só existem com a prop ligada, e somem sozinhos quando o
  // conteúdo cabe — ligar por padrão não muda nada nas telas que já cabiam.
  // Vem DEPOIS do spread para o chamador ainda conseguir desligar.
  return <TabView pt={pt ?? appTabViewPt} {...props} scrollable={scrollable ?? true} />
}

export { TabPanel as AppTabPanel }
