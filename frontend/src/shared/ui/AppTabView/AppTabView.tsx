import { TabView, TabPanel } from 'primereact/tabview'
import type { TabViewProps } from 'primereact/tabview'
import { useTranslation } from 'react-i18next'
import { primeSlotIcon } from '../AppIcon'
import { mergePt } from '../mergePt'

// Setas de rolagem da régua de abas: o Prime desenha o SVG; o botão é dele.
// `prevButton`/`nextButton` existem em runtime (`tabview.cjs.js:772,794`) e faltam
// no `TabViewProps` do pacote; por isso vão num objeto à parte, espalhado, e não
// como atributo JSX (que o tsc recusaria).
const SCROLL_ICONS = {
  prevButton: primeSlotIcon('chevronLeft'),
  nextButton: primeSlotIcon('chevronRight'),
}

export type { TabViewProps as AppTabViewProps } from 'primereact/tabview'

const appTabViewPt = {
  panelContainer: { className: 'p-0' },
}

export function AppTabView({ pt, ...props }: TabViewProps) {
  const { t } = useTranslation()
  // `scrollable` é do CHAMADOR, não default daqui. Sem ela a régua de abas
  // transborda sem seta, sombra ou qualquer sinal de que há mais aba fora da
  // tela, e em 390x844 três das cinco abas da turma nasciam invisíveis (UI-06 da
  // revisão de 2026-08-23) — é por isso que `TurmaDetailPage` a liga.
  //
  // Ligada por PADRÃO, como nasceu, a prop passava a valer também para os quatro
  // `ModuleTabs` (CommercialPage, AdministracionPage, PeoplePage,
  // CertificatesPage), e nenhum deles foi medido: `p-tabview-scrollable` troca a
  // nav por um contêiner com `overflow: hidden` (`tabview.cjs.js:156`), e dizer
  // que isso não muda nada nessas telas era suposição — a run de Comercial foi
  // justamente a que o bloco cortou (Q-3 do review de 2026-08-24). Liga-se por
  // sítio, conforme cada tela for medida.
  //
  // O NOME desses dois botões é piso daqui, pelo `pt`. O PrimeReact os rotula
  // com `api.ariaLabel('prevPageLabel')`/`'nextPageLabel'`
  // (`tabview.cjs.js:782,804`), que resolvem contra a locale GLOBAL dele. Esse
  // locale hoje segue o idioma da interface (`registerPrimeLocales`, em
  // `shared/config/primeLocale.ts`), mas o texto dele é "Página siguiente": o
  // controle rola ABAS e não páginas — e antes do bloco 66 o valor vinha do
  // inglês, "Next Page" medido em tela espanhola. Dois erros num rótulo só. O
  // piso daqui fica como DEFESA explícita, por componente, com palavra de aba. Mesma classe do "Choose Date" (UI-09 de 2026-08-17) e do
  // `emptyMessage` do `AppDropdown`, e mesmo remédio: chave nossa nas 3 locales.
  //
  // O piso entra DEPOIS do `pt` do chamador, pela mesma disciplina do
  // `customUpload` do `AppFileUpload`: acessibilidade não é o que um call site
  // desliga sem querer. O aninhamento de `mergePt` é o que mantém o default
  // daqui como PISO — até 2026-08-28 um `pt` qualquer do chamador SUBSTITUÍA o
  // default inteiro e o `p-0` do `panelContainer` sumia em silêncio (achado C3).
  return (
    <TabView
      {...SCROLL_ICONS}
      pt={mergePt(mergePt(appTabViewPt, pt), {
        prevButton: { 'aria-label': t('common.tabsScrollPrev') },
        nextButton: { 'aria-label': t('common.tabsScrollNext') },
      })}
      {...props}
    />
  )
}

export { TabPanel as AppTabPanel }
