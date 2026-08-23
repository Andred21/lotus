import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
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

afterEach(cleanup)

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
