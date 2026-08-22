import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageMenu } from './LanguageMenu'

// Fábrica única (rule frontend-fsliced.md, seção shared/testing/): mock parcial
// à mão ({ t }) estoura assim que um componente lê `i18n.language` — é
// exatamente o que o LanguageMenu faz para calcular `current`.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({ language: 'en' }),
  }
})

afterEach(cleanup)

// O menu é popup: só existe no DOM depois de abrir. Sob o mock, `t` devolve a
// CHAVE — o aria-label do botão sai como `common.language`, não como texto
// traduzido.
const abrirMenu = () => {
  fireEvent.click(screen.getByLabelText('common.language'))
}

describe('LanguageMenu', () => {
  it('UI-05: marca o idioma ATIVO (EN) com aria-current e classe visual — e só ele', () => {
    render(<LanguageMenu />)
    abrirMenu()

    // `getAllByRole('menuitem')` do RTL não serve aqui: o popup do Prime abre
    // sob `CSSTransition`, e em jsdom (sem rAF/transitionend reais) o nó fica
    // `display: none` além do fim do teste — RTL filtra por acessibilidade e
    // não acha nada, mesmo com os <li role="menuitem"> presentes no DOM (visto
    // na 1ª rodada desta catraca). Query direta no DOM, como o
    // `AppDropdown.test.tsx` vizinho já faz para o mesmo tipo de painel.
    //
    // Os rótulos ES/PT/EN não vêm do `t` (mock): vêm de SUPPORTED_LANGUAGES,
    // então aparecem literais no DOM.
    const porRotulo = (label: string) => {
      const rotulo = Array.from(document.querySelectorAll<HTMLElement>('.p-menuitem-text')).find(
        (span) => span.textContent === label,
      )
      return rotulo?.closest('li[role="menuitem"]')
    }

    const en = porRotulo('EN')
    const es = porRotulo('ES')
    const pt = porRotulo('PT')

    expect(en).toBeTruthy()
    expect(es).toBeTruthy()
    expect(pt).toBeTruthy()

    // 1) aria-current só no item ativo (EN) — o `role="menuitem"` está no
    // <li>, não no <a> (medido no DOM real do Prime 10.9.8).
    expect(en?.getAttribute('aria-current')).toBe('true')
    expect(es?.getAttribute('aria-current')).toBeNull()
    expect(pt?.getAttribute('aria-current')).toBeNull()

    // 2) marca visual só no item ativo — `p-focus` (que o Prime crava sempre
    // no PRIMEIRO item ao abrir) não é o que decide isto.
    expect(en?.className).toContain('lotus-language-active')
    expect(es?.className).not.toContain('lotus-language-active')
    expect(pt?.className).not.toContain('lotus-language-active')
  })
})
