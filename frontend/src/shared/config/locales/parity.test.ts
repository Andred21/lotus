import { describe, expect, it } from 'vitest'
import en from './en.json'
import esCL from './es-CL.json'
import ptBR from './pt-BR.json'

/** Um valor de locale é string (folha) ou um objeto aninhado de valores. */
type LocaleTree = { [key: string]: string | LocaleTree }

/** Achata em caminhos com ponto: `{ a: { b: 'x' } }` -> `['a.b']`. Compara
 * ESTRUTURA, não texto: chave presente em uma locale e ausente em outra é o
 * que renderiza a chave crua na tela do usuário chileno. */
function flatten(tree: LocaleTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  )
}

const locales = {
  'en': flatten(en as LocaleTree),
  'es-CL': flatten(esCL as LocaleTree),
  'pt-BR': flatten(ptBR as LocaleTree),
}

/** `es-CL` é a locale do cliente e a referência de comparação. */
const referencia = new Set(locales['es-CL'])

describe('paridade das locales', () => {
  it.each(['en', 'pt-BR'] as const)('%s tem exatamente as chaves de es-CL', (locale) => {
    const atual = new Set(locales[locale])

    const faltando = [...referencia].filter((k) => !atual.has(k)).sort()
    const excedente = [...atual].filter((k) => !referencia.has(k)).sort()

    expect(
      { faltando, excedente },
      `Locale ${locale} divergiu de es-CL. Faltando: ${faltando.join(', ') || '—'}. ` +
        `Excedente: ${excedente.join(', ') || '—'}.`,
    ).toEqual({ faltando: [], excedente: [] })
  })

  it('as 3 locales têm o mesmo total de chaves', () => {
    expect(locales['en']).toHaveLength(locales['es-CL'].length)
    expect(locales['pt-BR']).toHaveLength(locales['es-CL'].length)
  })
})
