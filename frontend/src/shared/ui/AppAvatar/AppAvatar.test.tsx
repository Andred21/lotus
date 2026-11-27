import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AppAvatar } from './AppAvatar'

/**
 * B-2 (D7): o celeste é raro. Uma coluna de avatares de iniciais pintava a
 * tabela inteira de marca e roubava o ponteiro da ação primária; a iniciais
 * viram neutras, e quem as quer sobre o shell (o gatilho do usuário) declara a
 * tinta pelo `style`.
 */
describe('AppAvatar — iniciais', () => {
  it('avatar de iniciais é neutro: fundo --surface-200, tinta --text-color, peso 600', () => {
    const { container } = render(<AppAvatar name="Juan Soto" />)

    const avatar = container.querySelector<HTMLElement>('.p-avatar')!
    expect(avatar.textContent).toBe('JS')
    expect(avatar.style.backgroundColor).toContain('--surface-200')
    expect(avatar.style.color).toContain('--text-color')
    expect(avatar.style.fontWeight).toBe('600')
  })

  it('o `style` do chamador vence o neutro e preserva o resto', () => {
    const { container } = render(
      <AppAvatar name="Juan Soto" style={{ backgroundColor: 'var(--brand)', width: '40px' }} />,
    )

    const avatar = container.querySelector<HTMLElement>('.p-avatar')!
    expect(avatar.style.backgroundColor).toContain('--brand')
    expect(avatar.style.width).toBe('40px')
    expect(avatar.style.color).toContain('--text-color')
  })
})
