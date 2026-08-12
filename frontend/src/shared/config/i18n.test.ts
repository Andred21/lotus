import { afterAll, describe, expect, it } from 'vitest'
import i18n from './i18n'

/**
 * O que este teste protege é o ESPELHO do idioma no documento (WCAG 3.1.1,
 * nível A) — não o dicionário.
 *
 * O defeito real (UI-03 do review de 2026-08-12): `<html lang>` era estático em
 * `en` e nada o sincronizava. Com a interface inteira renderizada em es-CL, o
 * documento continuava declarando inglês, e o leitor de tela pronunciava
 * espanhol e português com voz inglesa. Nada disso aparece na tela — por isso
 * nenhuma medição visual do bloco pegou.
 *
 * Os dois casos são distintos de propósito: o primeiro load (o detector já
 * resolveu, sem nunca ter havido troca) e a troca em si.
 */

const idiomaOriginal = i18n.language

afterAll(async () => {
  await i18n.changeLanguage(idiomaOriginal)
})

describe('i18n × <html lang>', () => {
  it('escreve o idioma resolvido já no primeiro load, sem troca nenhuma', () => {
    expect(document.documentElement.lang).toBe(i18n.resolvedLanguage)
  })

  it('acompanha a troca de idioma', async () => {
    for (const codigo of ['pt-BR', 'en', 'es-CL'] as const) {
      await i18n.changeLanguage(codigo)
      expect(document.documentElement.lang).toBe(codigo)
    }
  })
})
