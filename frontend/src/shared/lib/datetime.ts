// Formatters puros de data/hora. Locale do cliente (Chile) por padrão.
const LOCALE = 'es-CL'

/** Hora no formato HH:MM. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

/** Data no formato curto local (dd-mm-aaaa em es-CL). */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(LOCALE)
}
