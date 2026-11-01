import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormSection } from './FormSection'
import { sectionLabelClass } from '../typography'

/**
 * A D1/P-36 do audit de 2026-08-26 tirou a tinta de marca do título de seção
 * (2,77:1 sobre o humo; celeste em sete papéis na mesma dobra de `/perfil`) e
 * este arquivo travava a decisão. O João reverteu em 2026-11-01: o título volta
 * ao `--primary-color` nos dois temas, com a linha contínua até a borda. No
 * escuro passa o AA; no claro fica em 2,77:1 no card e 2,53:1 no humo, e ele
 * aceitou esse contraste como decisão dele. Os casos abaixo são o mecanismo da
 * regra nova — sem eles, a próxima auditoria reabre a ficha pelo contraste.
 */
describe('FormSection', () => {
  it('pinta o título de --primary-color (reversão da D1/P-36, João, 2026-11-01)', () => {
    render(<FormSection title="Identidad" />)

    const titulo = screen.getByRole('heading', { name: 'Identidad' })
    expect(titulo.getAttribute('style')).toContain('var(--primary-color)')
  })

  it('traz a linha contínua até a borda', () => {
    const { container } = render(<FormSection title="Identidad" />)

    expect(container.querySelector('span[aria-hidden="true"]')?.getAttribute('style'))
      .toContain('var(--section-rule)')
  })

  it('carrega a hierarquia no peso e no tracking', () => {
    render(<FormSection title="Identidad" />)

    const titulo = screen.getByRole('heading', { name: 'Identidad', level: 3 })
    expect(titulo.className).toContain(sectionLabelClass)
  })

  it('`spaced` acrescenta o respiro de cima sem mexer no resto', () => {
    const { container } = render(<FormSection title="Seguridad" spaced />)

    expect(container.firstElementChild?.className).toContain('pt-2')
  })

  /**
   * `h3` é o nível de seção DENTRO de diálogo, sob o `h1` da página. No Perfil
   * as três seções dividem a própria página e saíam `h1,h3,h3,h3` — nível
   * pulado nas três viewports (f2 UI-03, run de 2026-08-28). O nível é do
   * chamador; a grafia não muda.
   */
  it('`as="h2"` sobe o nível sem trocar a grafia', () => {
    render(<FormSection title="Datos personales" as="h2" />)

    const titulo = screen.getByRole('heading', { name: 'Datos personales', level: 2 })
    expect(titulo.className).toContain(sectionLabelClass)
  })
})
