import { TabView, TabPanel } from 'primereact/tabview'
import type { TabViewProps } from 'primereact/tabview'
import { useTranslation } from 'react-i18next'

export type { TabViewProps as AppTabViewProps } from 'primereact/tabview'

const appTabViewPt = {
  panelContainer: { className: 'p-0' },
}

export function AppTabView({ pt, scrollable, ...props }: TabViewProps) {
  const { t } = useTranslation()
  // `scrollable` liga por PADRÃO: sem ela a régua de abas transborda sem seta,
  // sombra ou qualquer sinal de que há mais aba fora da tela, e em 390x844 três
  // das cinco abas da turma nasciam invisíveis (UI-06 da revisão de 2026-08-23).
  // Os botões prev/next só existem com a prop ligada, e somem sozinhos quando o
  // conteúdo cabe — ligar por padrão não muda nada nas telas que já cabiam.
  // Vem DEPOIS do spread para o chamador ainda conseguir desligar.
  //
  // O NOME desses dois botões é piso daqui, pelo `pt`. O PrimeReact os rotula
  // com `api.ariaLabel('prevPageLabel')`/`'nextPageLabel'`
  // (`tabview.cjs.js:782,804`), que resolvem contra a locale GLOBAL dele — e
  // `locale()` nunca é chamado no projeto (`primeLocale.ts` só registra), então
  // o valor vinha sempre do default inglês: "Next Page" medido em tela
  // espanhola. Dois erros num rótulo só, porque o controle rola ABAS e não
  // páginas. Mesma classe do "Choose Date" (UI-09 de 2026-08-17) e do
  // `emptyMessage` do `AppDropdown`, e mesmo remédio: chave nossa nas 3 locales.
  //
  // O piso entra DEPOIS do `pt` do chamador — que aqui SUBSTITUI o default
  // inteiro, não faz merge — pela mesma disciplina do `customUpload` do
  // `AppFileUpload`: acessibilidade não é o que um call site desliga sem querer.
  return (
    <TabView
      pt={{
        ...(pt ?? appTabViewPt),
        prevButton: { 'aria-label': t('common.tabsScrollPrev') },
        nextButton: { 'aria-label': t('common.tabsScrollNext') },
      }}
      {...props}
      scrollable={scrollable ?? true}
    />
  )
}

export { TabPanel as AppTabPanel }
