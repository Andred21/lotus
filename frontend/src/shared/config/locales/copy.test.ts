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
