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
  { code: 'es-CL', label: 'ES', flag: 'es' },
  { code: 'pt-BR', label: 'PT', flag: 'br' },
  { code: 'en', label: 'EN', flag: 'us' },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

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

export default i18n
