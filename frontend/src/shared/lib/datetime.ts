import i18n from '@shared/config/i18n'

/**
 * Formatters de data/hora. O locale é o **idioma ativo da interface**, não uma
 * constante: fixar um locale fazia a tela em pt-BR ou en exibir mês em
 * espanhol (e o cabeçalho dizia "Chile" enquanto o código passava `pt-br`).
 *
 * Os três locales suportados são tags BCP-47 válidas (`pt-BR`, `es-CL`, `en`),
 * então servem direto ao `Intl`.
 */
function activeLocale(): string {
  return i18n.language || 'es-CL'
}

/** Hora no formato HH:MM. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(activeLocale(), { hour: '2-digit', minute: '2-digit' })
}

/** Data no formato curto do idioma ativo (dd-mm-aaaa em es-CL). */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(activeLocale())
}

/**
 * Data + hora no formato curto do idioma ativo ("12-08-2026 14:32" em es-CL).
 * Usado no "último acesso" das tabelas de Usuários e Redatores.
 *
 * Compõe os dois formatters acima em vez de chamar `Intl` de novo: o locale
 * ativo já é resolvido por eles, num lugar só.
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * Mês abreviado + ano ("mar 2026"). Usado onde o dia não importa — histórico de
 * vínculo e de turmas do aluno.
 *
 * Recebe a data ISO (`YYYY-MM-DD`) que o backend projeta e ancora em meio-dia:
 * `new Date('2026-03-01')` é interpretado como UTC e, num fuso a oeste, volta
 * um dia — o que trocaria o mês exibido na virada.
 */
export function formatMonthYear(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(activeLocale(), {
    month: 'short',
    year: 'numeric',
  })
}
