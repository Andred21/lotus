import { describe, expect, it } from 'vitest'
import { cardTitleClass, fieldLabelClass, identifierClass, pageTitleClass, sectionLabelClass, statValueClass, technicalDataClass, validationVerdictClass } from './typography'

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

  /** Dado técnico é mono COM tabular — o par é inseparável, e a fase 2 mediu
   * sete sítios com metade do par (`font-mono` sozinho). A constante é o que
   * impede a próxima cópia de perder a metade. */
  it('dado técnico carrega o par mono + tabular', () => {
    expect(technicalDataClass).toBe('font-mono tabular-nums')
  })

  /** Identificador é token único: RUT, folio e código não quebram no hífen —
   * a fase 1 mediu "76.123.456-" / "0" a 1024px. */
  it('identificador é dado técnico que não quebra', () => {
    expect(identifierClass).toBe('font-mono tabular-nums whitespace-nowrap')
  })

  /** Título de CARD e faixa de seção são dois REGISTROS, não dois degraus de
   * uma escala (D-63): eyebrow codifica profundidade por caixa e posição, título
   * por corpo. Monotonizar apagaria o registro eyebrow em toda tela que o usa —
   * e o `SectionLabel` acabou de ser unificado a partir de 5 grafias. A prova de
   * que são registros diferentes é esta: um tem caixa alta e o outro não. */
  it('o título de card é corpo, e não a faixa de caixa alta', () => {
    expect(cardTitleClass).toBe('text-base font-semibold')
    expect(cardTitleClass).not.toContain('uppercase')
    expect(sectionLabelClass).toContain('uppercase')
  })

  /** O veredito de `/validar` precisa ficar no mesmo degrau do folio (D-63):
   * `pageTitleClass` é 24px com `tracking-tight` e ainda perderia dos 30px do
   * folio — por isso é constante própria, não reuso. */
  it('o veredito da validação pública sobe ao degrau do folio, não ao de pageTitleClass', () => {
    expect(validationVerdictClass).toBe('font-display text-3xl font-semibold')
    expect(validationVerdictClass).not.toBe(pageTitleClass)
  })
})
