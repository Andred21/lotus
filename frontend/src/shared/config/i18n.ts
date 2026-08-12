import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import esCL from './locales/es-CL.json'
import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'

/**
 * Idiomas suportados (ADR-15). Default es-CL — o produto é para o cliente
 * chileno. `flag` = código ISO usado pelo flag-icons (`fi fi-<flag>`).
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'es-CL', label: 'ES', flag: 'cl' },
  { code: 'pt-BR', label: 'PT', flag: 'br' },
  { code: 'en', label: 'EN', flag: 'us' },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

/**
 * Espelha o idioma ativo em `<html lang>` (WCAG 3.1.1, nível A).
 *
 * O `index.html` declara o default do produto, mas quem sabe o idioma REAL é o
 * detector — e ele resolve por localStorage/navigator, então a declaração
 * estática já nasce podendo estar errada no primeiro load. Antes disso o
 * documento dizia `en` com a interface inteira em espanhol (UI-03 do review de
 * 2026-08-12): o leitor de tela pronunciava es-CL e pt-BR com voz inglesa.
 *
 * Vive aqui, e não num efeito de React, porque o gatilho é do i18n e não do
 * ciclo de render: a troca de idioma acontece fora da árvore (o menu chama
 * `changeLanguage`) e o primeiro load precisa acertar o atributo antes de
 * qualquer componente montar. É o irmão não-React do `useApplyTheme`, que faz
 * o mesmo para a classe de tema.
 */
const aplicarIdiomaNoDocumento = (lng?: string): void => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lng ?? i18n.resolvedLanguage ?? 'es-CL'
}

i18n.on('languageChanged', aplicarIdiomaNoDocumento)

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'es-CL': { translation: esCL },
      'pt-BR': { translation: ptBR },
      en: { translation: en },
    },
    fallbackLng: 'es-CL',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lotus-lang',
      caches: ['localStorage'],
    },
  })

// O `languageChanged` acima cobre as trocas; esta chamada cobre o primeiro
// load, em que o detector já resolveu o idioma sem nunca ter havido troca.
aplicarIdiomaNoDocumento()

export default i18n
