import { vi } from 'vitest'

/** Forma real de `useTranslation` para teste. Existe porque 17 arquivos
 * devolviam só `t`, e o `AppDropdown` lê `i18n.language` para remontar na troca
 * de idioma (UI-03, `ac4eef8a`): mock parcial estoura com
 * `Cannot read properties of undefined (reading 'language')`. Home única — o
 * próximo campo que a API do hook exigir se conserta aqui, não em 17 lugares.
 *
 * `t` devolve a CHAVE: o que os testes provam é qual texto a tela escolhe, não
 * a tradução dele — isso é do `parity.test.ts`. */
export type TFunctionLike = (key: string, opts?: Record<string, unknown>) => string

export function mockUseTranslation(over: { t?: TFunctionLike; language?: string } = {}) {
  const t: TFunctionLike = over.t ?? ((key: string) => key)
  const i18n = { language: over.language ?? 'es-CL', changeLanguage: vi.fn() }
  return () => ({ t, i18n, ready: true })
}
