import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AppTabView, AppTabPanel } from './AppTabView'

// O wrapper lê `t` para o piso de nome dos botões prev/next: sem o kit, o teste
// cairia no caminho "sem instância" do react-i18next.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// jsdom não faz layout (`clientWidth`/`scrollWidth` ficam 0), então o TabView
// do PrimeReact desabilita os dois lados e os botões prev/next nunca aparecem
// aqui — não é o que este teste prova, e é por isso que o piso de `aria-label`
// deles não tem catraca: o que se poderia afirmar em jsdom é a forma do objeto
// `pt`, não o rótulo na tela. O efeito observável de `scrollable` ter chegado ao
// componente é a classe `p-tabview-scrollable` na raiz (`tabview.cjs.js:156`).
function root(container: HTMLElement) {
  return container.querySelector('.p-tabview') as HTMLElement
}

describe('AppTabView', () => {
  // O default ficou de fora de propósito: a régua rolável foi medida numa tela
  // (a da turma) e ligá-la por padrão a estendia a quatro `ModuleTabs` que
  // ninguém mediu (Q-3 do review de 2026-08-24).
  it('não liga scrollable sozinho: quem mediu a tela é que pede', () => {
    const { container } = render(
      <AppTabView>
        <AppTabPanel header="Um">a</AppTabPanel>
        <AppTabPanel header="Dois">b</AppTabPanel>
      </AppTabView>,
    )

    expect(root(container).className).not.toContain('p-tabview-scrollable')
  })

  it('o sítio que pede recebe', () => {
    const { container } = render(
      <AppTabView scrollable>
        <AppTabPanel header="Um">a</AppTabPanel>
        <AppTabPanel header="Dois">b</AppTabPanel>
      </AppTabView>,
    )

    expect(root(container).className).toContain('p-tabview-scrollable')
  })

  /**
   * `...(pt ?? appTabViewPt)` apagava o default de quem passasse QUALQUER `pt`
   * (achado C3): um chamador que só quisesse ajustar o `nav` perdia o `p-0` do
   * `panelContainer` em silêncio. É a mesma família do Q-5 do review do item 8 —
   * e o remédio é o `mergePt`, que `AppDialog`, `AppDatePicker`, `AppDataTable`,
   * `AppFileUpload` e `AppPassword` já usam.
   */
  it('o `pt` do chamador funde com o default, não o substitui', () => {
    const { container } = render(
      <AppTabView pt={{ nav: { className: 'marca-do-chamador' } }}>
        <AppTabPanel header="Uno"><p>uno</p></AppTabPanel>
      </AppTabView>,
    )

    expect(container.querySelector('.marca-do-chamador')).not.toBeNull()
    expect(container.querySelector('.p-tabview-panels')?.className).toContain('p-0')
  })
})
