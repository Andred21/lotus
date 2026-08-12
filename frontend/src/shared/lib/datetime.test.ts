import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime } from './datetime'

describe('formatDateTime', () => {
  const d = new Date(2026, 7, 12, 14, 32)

  it('compõe data e hora do idioma ativo, nesta ordem', () => {
    expect(formatDateTime(d)).toBe(`${formatDate(d)} ${formatTime(d)}`)
  })

  it('inclui a hora — não é formatDate disfarçado', () => {
    expect(formatDateTime(d)).not.toBe(formatDate(d))
    expect(formatDateTime(d)).toContain(formatTime(d))
  })

  it('preserva a data de um horário de meia-noite', () => {
    const meiaNoite = new Date(2026, 7, 12, 0, 0)
    expect(formatDateTime(meiaNoite)).toContain(formatDate(meiaNoite))
  })

  it('formata ISO vindo do backend sem perder o dia', () => {
    const doBackend = new Date('2026-08-12T14:32:00.000Z')
    expect(formatDateTime(doBackend)).toBe(`${formatDate(doBackend)} ${formatTime(doBackend)}`)
  })
})
