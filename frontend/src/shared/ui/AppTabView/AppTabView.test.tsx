import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { AppTabView, AppTabPanel } from './AppTabView'

afterEach(cleanup)

// jsdom não faz layout (`clientWidth`/`scrollWidth` ficam 0), então o TabView
// do PrimeReact desabilita os dois lados e os botões prev/next nunca aparecem
// aqui — não é o que este teste prova. O efeito observável de `scrollable` ter
// chegado ao componente é a classe `p-tabview-scrollable` na raiz
// (`tabview.cjs.js:156`).
function root(container: HTMLElement) {
  return container.querySelector('.p-tabview') as HTMLElement
}

describe('AppTabView', () => {
  it('liga scrollable por padrão, sem o chamador pedir', () => {
    const { container } = render(
      <AppTabView>
        <AppTabPanel header="Um">a</AppTabPanel>
        <AppTabPanel header="Dois">b</AppTabPanel>
      </AppTabView>,
    )

    expect(root(container).className).toContain('p-tabview-scrollable')
  })

  it('chamador ainda consegue desligar', () => {
    const { container } = render(
      <AppTabView scrollable={false}>
        <AppTabPanel header="Um">a</AppTabPanel>
        <AppTabPanel header="Dois">b</AppTabPanel>
      </AppTabView>,
    )

    expect(root(container).className).not.toContain('p-tabview-scrollable')
  })
})
