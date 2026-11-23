import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

/** País pré-selecionado do `PhoneInput`: a Lotus é chilena. */
export const PHONE_DEFAULT_COUNTRY: CountryCode = 'CL'

/** Só o que um telefone digitado ou colado pode conter. O resto ("abc") não é
 * formatado: sobe cru, e a API devolve o 422 (spec §4.8). */
const PHONE_SHAPE = /^[\d\s()+.-]*$/

/** O telefone para LEITURA: formato internacional (`+56 9 8765 4321`). Vazio dá
 * `''`; o que não parseia volta cru, para o dado errado aparecer em vez de sumir.
 * A API grava E.164, então o `+` do país sempre vem no valor. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  const raw = value?.trim() ?? ''
  if (!raw) return ''
  return parsePhoneNumberFromString(raw)?.formatInternational() ?? raw
}

/** O estado do `PhoneInput`: país e texto como o usuário os vê, mais o que o
 * campo entrega ao formulário (`emit`: E.164 se parseia, o cru se não, `null`
 * se vazio). Quem valida é a API, então `emit` nunca depende de `isValid()`. */
export type PhoneDraft = { country: CountryCode; text: string; emit: string | null }

/** O que o campo mostra e emite para um texto digitado ou colado. Com `+` na
 * frente o texto é internacional: o país sai do próprio código e o campo passa
 * a mostrar só o número nacional — por isso colar `+56 9 8765 4321` com o Chile
 * selecionado não vira `+5656…`. */
export function phoneFromText(raw: string, country: CountryCode): PhoneDraft {
  const trimmed = raw.trim()
  if (!trimmed) return { country, text: '', emit: null }
  if (!PHONE_SHAPE.test(trimmed)) return { country, text: raw, emit: trimmed }

  if (trimmed.startsWith('+')) {
    const typing = new AsYouType()
    const text = typing.input(trimmed)
    const emit = parsePhoneNumberFromString(trimmed)?.number ?? trimmed
    const detected = typing.getCountry()
    // Sem país resolvido (`+5`, `+1 2`) o texto fica internacional até o código
    // fechar; só então ele vira nacional.
    if (!detected) return { country, text, emit }
    return { country: detected, text: new AsYouType(detected).input(typing.getNationalNumber()), emit }
  }

  const emit = parsePhoneNumberFromString(trimmed, country)?.number ?? trimmed
  return { country, text: new AsYouType(country).input(trimmed), emit }
}

/** Troca o país mantendo os dígitos nacionais: reformata e emite com o código novo. */
export function phoneWithCountry(text: string, country: CountryCode): PhoneDraft {
  const national = text.trim().startsWith('+')
    ? (parsePhoneNumberFromString(text)?.nationalNumber ?? text)
    : text
  return phoneFromText(national.replace(/\D/g, ''), country)
}

/** O estado para um valor que chega de fora (o que a API gravou ou o form tinha). */
export function phoneFromValue(value: string | null | undefined): PhoneDraft {
  const raw = value?.trim() ?? ''
  const emit = value || null
  if (!raw) return { country: PHONE_DEFAULT_COUNTRY, text: '', emit }
  const parsed = parsePhoneNumberFromString(raw, PHONE_DEFAULT_COUNTRY)
  if (!parsed) return { country: PHONE_DEFAULT_COUNTRY, text: raw, emit }
  if (!parsed.country) return { country: PHONE_DEFAULT_COUNTRY, text: parsed.formatInternational(), emit }
  return { country: parsed.country, text: new AsYouType(parsed.country).input(parsed.nationalNumber), emit }
}

export type PhoneCountryOption = { code: CountryCode; name: string; calling: string }

/** Os países do seletor, com o nome no idioma da interface e em ordem alfabética
 * dele. `calling` vai sem o `+` para o filtro achar `56` e `+56` do mesmo jeito. */
export function phoneCountryOptions(language: string): PhoneCountryOption[] {
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames([language], { type: 'region' })
  } catch {
    names = null
  }
  return getCountries()
    .map((code) => ({ code, name: names?.of(code) ?? code, calling: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, language))
}
