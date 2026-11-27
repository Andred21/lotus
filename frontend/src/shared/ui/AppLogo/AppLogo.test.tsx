import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AppLogo } from './AppLogo'

/**
 * D-10 do audit de 2026-11-26: o `<img>` sem `width`/`height` não reserva
 * caixa antes do PNG chegar, e o login e a sidebar saltavam. Com o `h-auto` do
 * preflight, o atributo vira só a razão de aspecto. Que os números batam com o
 * arquivo é de `tests/logo-dimensoes.test.ts`, que lê o cabeçalho do PNG (aqui,
 * em `src`, o tsconfig não tem os tipos do Node).
 */
describe('logo tem dimensões', () => {
  it.each([
    ['auto', '335', '466'],
    ['on-dark', '335', '466'],
    ['glyph', '224', '274'],
  ] as const)('a variante %s declara %sx%s', (variant, width, height) => {
    const { container } = render(<AppLogo variant={variant} />)
    const img = container.querySelector('img')!

    expect(img.getAttribute('width')).toBe(width)
    expect(img.getAttribute('height')).toBe(height)
  })
})
