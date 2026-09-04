import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppTag } from './AppTag'

function tag(nome: string) {
  return screen.getByText(nome).closest('.p-tag') as HTMLElement
}

/**
 * O tom PREENCHIDO reprovava AA: `Vigente` media 2,28:1 e as tags de curso
 * 2,77:1, ambas branco sobre saturado a 12px/700 — e 12px bold não é "texto
 * grande" para a WCAG (o corte é 18,66px), então a régua é 4,5:1. A correção
 * (spec D2) é a mecânica que o `ACCENT` deste mesmo arquivo já usa: fundo
 * composto com `--surface-card` e tinta de tom, que é a tese que o passe de
 * 2026-08-17 fixou no Dashboard — cor de sinal em fundo, texto em contraste
 * cheio.
 */
describe('AppTag — tom não preenche mais', () => {
  it.each([
    ['success', 'green', '--tone-success-ink'],
    ['info', 'blue', '--tone-info-ink'],
    ['warning', 'yellow', '--tone-warning-ink'],
    ['danger', 'red', '--tone-danger-ink'],
  ] as const)('%s compõe fundo suave e tinta de tom', (severity, hue, ink) => {
    render(<AppTag value={severity} severity={severity} />)

    const style = tag(severity).getAttribute('style') ?? ''
    expect(style).toContain('color-mix')
    expect(style).toContain(`var(--${hue}-500)`)
    expect(style).toContain(`var(${ink})`)
  })

  it('secondary continua NEUTRO e intocado', () => {
    // Mede 8,4:1 e é a única que já passava. Foi a correção de 2026-08-16
    // (UI-03), quando `.p-tag-secondary` não existia no Lara e a severidade
    // caía na regra base, pintando a marca no lugar do neutro.
    render(<AppTag value="Sin subir" severity="secondary" />)

    const style = tag('Sin subir').getAttribute('style') ?? ''
    expect(style).toContain('var(--surface-200)')
    expect(style).toContain('var(--text-color)')
  })

  it('accent segue com a própria fórmula', () => {
    render(<AppTag value="Online" tone="accent" />)

    expect(tag('Online').getAttribute('style')).toContain('var(--purple-500)')
  })

  it('o `style` do chamador continua vencendo', () => {
    render(<AppTag value="Vigente" severity="success" style={{ color: 'var(--text-color)' }} />)

    expect(tag('Vigente').style.color).toBe('var(--text-color)')
  })
})
