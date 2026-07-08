// Formatters puros de data/hora. Locale do cliente (Chile) por padrão.


/** Hora no formato HH:MM. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-br', { hour: '2-digit', minute: '2-digit' })
}

/** Data no formato curto local (dd-mm-aaaa em es-CL). */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-br')
}
