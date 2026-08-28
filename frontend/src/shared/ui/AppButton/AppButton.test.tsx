import { describe, expect, it } from 'vitest'
import { appButtonStyles } from './style'

/**
 * O vocabulário nomeia PAPEL, não aparência. `brandIcon` era o nome do
 * só-ícone e virou a CTA do produto em 17 sítios com `label=`, enquanto
 * `brandLabel` — o nome que sugeria rótulo — sobrou em 2 (achado B1 do audit de
 * 2026-08-26). Nome que mente faz a próxima CTA nascer no variant errado.
 */
describe('vocabulário de botão', () => {
  it('as chaves são os quatro papéis, e os nomes velhos não voltam', () => {
    expect(Object.keys(appButtonStyles).sort()).toEqual(
      ['compact', 'iconToggle', 'noSurface', 'primary'],
    )
  })

  /**
   * A promessa da D3: o rename NÃO mexe na cascata dos 17 sítios. `primary`
   * herda o padding e o tamanho de fonte do `.p-button` do Lara-Lotus
   * (0.75rem 1.25rem, 1rem) porque não declara os seus. Declarar padding aqui
   * encolheria as 17 CTAs — foi o que a medição do desenho pegou, contra o
   * "byte-idêntico" que o audit supôs sem medir.
   */
  it('`primary` não declara padding nem tamanho de fonte — herda o tema', () => {
    expect(appButtonStyles.primary).not.toMatch(/\b(p|px|py|pt|pb|pl|pr)-/)
    expect(appButtonStyles.primary).not.toMatch(/\btext-(xs|sm|base|lg|xl)\b/)
  })

  /** `iconToggle` é a MESMA superfície de `primary`: o que os separa é o papel
   * (toggle de tema e de colapso não têm rótulo), não a grafia. */
  it('`iconToggle` e `primary` compartilham a grafia', () => {
    expect(appButtonStyles.iconToggle).toBe(appButtonStyles.primary)
  })

  /** `compact` é o único que aperta a geometria — é o seletor de idioma e o
   * "Aprobar" dentro da linha de cotação, onde o botão do tema não cabe. */
  it('`compact` aperta padding e fonte, e só ele', () => {
    expect(appButtonStyles.compact).toContain('px-3 py-2.5 text-sm')
  })
})
