import { describe, expect, it } from 'vitest'
import { fieldLabelClass, pageTitleClass, sectionLabelClass, statValueClass } from './typography'

/**
 * Os dois `h1` do produto tinham vozes diferentes — `font-display … tracking-tight`
 * no `PageHeader`, `text-2xl font-bold` no `DetailHeader` (achado A1) — e o
 * título de auth estava copiado literal em 5 arquivos (A5). Uma constante é o
 * que faz a próxima tela herdar a voz em vez de recopiá-la.
 */
describe('grafias tipográficas por papel', () => {
  it('o título de página carrega a família de display e o tracking apertado', () => {
    expect(pageTitleClass).toBe('font-display text-2xl font-semibold tracking-tight')
  })

  it('a faixa de seção é caixa alta miúda com tracking aberto', () => {
    expect(sectionLabelClass).toBe('text-xs font-semibold tracking-wider uppercase')
  })

  /** Rótulo de CAMPO é peça diferente da faixa de seção (spec D5): os `<dt>` da
   * validação e do diálogo de emissão não encabeçam grupo nenhum, e promovê-los
   * a heading inventaria hierarquia numa página pública de peso legal. */
  it('o rótulo de campo não é heading — não carrega o peso da faixa', () => {
    expect(fieldLabelClass).toBe('text-xs uppercase tracking-wide')
    expect(fieldLabelClass).not.toContain('font-semibold')
  })

  /** Número de estatística SEMPRE em `tabular-nums`: sem ele o dígito dança na
   * coluna a cada re-render (o UF do `BudgetStatCard`, achado A3). */
  it('o número de estatística é sempre tabular, nos dois degraus', () => {
    expect(statValueClass('page')).toContain('tabular-nums')
    expect(statValueClass('card')).toContain('tabular-nums')
    expect(statValueClass('page')).toContain('text-3xl')
    expect(statValueClass('card')).toContain('text-2xl')
    expect(statValueClass('page')).toContain('font-display')
  })
})
