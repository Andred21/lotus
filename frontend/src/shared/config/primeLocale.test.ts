import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ariaLabel, locale, localeOptions } from 'primereact/api'
import i18n from './i18n'
import { registerPrimeLocales } from './primeLocale'

beforeAll(registerPrimeLocales)
afterEach(async () => {
  await i18n.changeLanguage('es-CL')
  locale('en')
})

/** A-12: o botão de fechar do Dialog/Toast e os controles do paginador leem o
 * nome do locale GLOBAL do Prime. Sem o bloco `aria`, `es` e `pt` herdavam o
 * inglês do `en`. */
describe('primeLocale — rótulos aria', () => {
  it('Prime traduz os rótulos aria em es e pt', () => {
    locale('es')
    expect(ariaLabel('close', {})).toBe('Cerrar')
    expect(ariaLabel('pageLabel', { page: 3 })).toBe('Página 3')
    expect(ariaLabel('rowsPerPageLabel', {})).toBe('Filas por página')

    locale('pt')
    expect(ariaLabel('close', {})).toBe('Fechar')
    expect(ariaLabel('pageLabel', { page: 3 })).toBe('Página 3')
    expect(ariaLabel('rowsPerPageLabel', {})).toBe('Linhas por página')
  })

  /** `addLocale` só registra: quem lê é o locale GLOBAL (`locale()`), e ele nunca
   * era trocado. Sem seguir o `i18n`, o bloco `aria` ficava instalado e mudo. */
  it('o locale do Prime segue o idioma da interface', async () => {
    await i18n.changeLanguage('pt-BR')
    expect(ariaLabel('close', {})).toBe('Fechar')

    await i18n.changeLanguage('es-CL')
    expect(ariaLabel('close', {})).toBe('Cerrar')

    await i18n.changeLanguage('en')
    expect(ariaLabel('close', {})).toBe('Close')
  })

  it('en é registrado explícito, com o mesmo conjunto de chaves de es e pt', () => {
    locale('en')
    expect(ariaLabel('close', {})).toBe('Close')
    expect(ariaLabel('pageLabel', { page: 3 })).toBe('Page 3')

    const chaves = (idioma: string) => Object.keys(ariaLabelsDe(idioma)).sort()
    expect(chaves('es')).toEqual(chaves('en'))
    expect(chaves('pt')).toEqual(chaves('en'))
  })

  it('nenhuma chave de es ou pt fica vazia', () => {
    for (const idioma of ['es', 'pt']) {
      for (const [chave, valor] of Object.entries(ariaLabelsDe(idioma))) {
        expect(valor, `${idioma}.${chave}`).toBeTruthy()
      }
    }
  })
})

function ariaLabelsDe(idioma: string): Record<string, string> {
  return (localeOptions(idioma) as { aria: Record<string, string> }).aria
}
