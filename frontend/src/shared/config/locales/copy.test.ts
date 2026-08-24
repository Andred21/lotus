import { describe, expect, it } from 'vitest'
import en from './en.json'
import esCL from './es-CL.json'
import ptBR from './pt-BR.json'

/** Um valor de locale é folha (string, número, booleano) ou objeto aninhado —
 * mesmo critério de `parity.test.ts`. */
type LocaleTree = { [key: string]: unknown }

const ehFolha = (valor: unknown): boolean => typeof valor !== 'object' || valor === null

/** Achata em pares `[caminho, valor]`, preservando o VALOR da folha — `parity.test.ts`
 * compara ESTRUTURA e descarta o texto; este teste varre o TEXTO em si. */
function flattenEntries(tree: LocaleTree, prefix = ''): [string, unknown][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    ehFolha(value)
      ? ([[`${prefix}${key}`, value]] as [string, unknown][])
      : flattenEntries(value as LocaleTree, `${prefix}${key}.`),
  )
}

const locales = {
  'es-CL': flattenEntries(esCL as LocaleTree),
  'pt-BR': flattenEntries(ptBR as LocaleTree),
  'en': flattenEntries(en as LocaleTree),
}

/** Código interno de regra de negócio (`(RN-09)`, `(RN-15)`, ...) entre parênteses no
 * fim da frase. O operador da Lotus não tem onde consultar "RN-09" — achado UI-04 da
 * run 2 do `/lotus-ui-review`. Varredura genérica por FORMATO, não pela lista de chaves
 * de hoje: a catraca precisa pegar a próxima chave que nascer com o código. */
const CODIGO_RN = /\(RN-\d+\)/

describe('sem código de regra de negócio na tela', () => {
  it.each(Object.keys(locales) as (keyof typeof locales)[])(
    '%s: nenhuma chave carrega código de regra de negócio no texto',
    (locale) => {
      const comCodigo = locales[locale]
        .filter(([, valor]) => typeof valor === 'string' && CODIGO_RN.test(valor))
        .map(([chave]) => chave)

      expect(
        comCodigo,
        `Locale ${locale} tem código de regra de negócio vazando pra tela nas chaves: ${comCodigo.join(', ') || '—'}.`,
      ).toEqual([])
    },
  )
})

/** Sinônimo em inglês do papel `Redator` — "editor", "writer" ou "instructor", com ou sem
 * plural, sem diferenciar maiúsculas. Achado UI-05 da run 2 do `/lotus-ui-review`: a aba
 * "Redator" e o cartão "Editor assessment" nomeiam o MESMO papel com palavras diferentes,
 * e o operador em inglês não tem como saber que são a mesma coisa. */
const SINONIMO_REDATOR_EN = /\b(editors?|writers?|instructors?)\b/i

/** Varredura restrita à sub-árvore `operation.*` do locale `en` — é o módulo que a run 2
 * mediu em tela. As outras 33 grafias do mesmo sinônimo (`roleName.redator`,
 * `course.sectionRedatores`, `dashboard.redatorLoad.*`, `redator.*`, `perm.*`, ...) vivem
 * fora da superfície revisada e são trabalho de outro bloco; alargar a varredura agora
 * reprovaria código que ninguém mediu. A árvore guarda é o MÓDULO inteiro, não a chave de
 * hoje — qualquer folha nova de `operation.*` que reintroduzir "editor"/"writer"/"instructor"
 * cai aqui. */
describe('vocabulário de domínio: papel "Redator" não vira sinônimo em inglês (operation.*)', () => {
  it('en: nenhuma chave de operation.* chama o redator de editor/writer/instructor', () => {
    const operationEn = flattenEntries(en.operation as LocaleTree, 'operation.')
    const comSinonimo = operationEn
      .filter(([, valor]) => typeof valor === 'string' && SINONIMO_REDATOR_EN.test(valor))
      .map(([chave]) => chave)

    expect(
      comSinonimo,
      `Locale en tem sinônimo de "redator" (editor/writer/instructor) vazando pra tela nas chaves: ${comSinonimo.join(', ') || '—'}.`,
    ).toEqual([])
  })
})
