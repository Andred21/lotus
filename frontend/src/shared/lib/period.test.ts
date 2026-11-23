import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { currentCalendarPeriod, isWithinPeriod } from './period'

// Fixa o fuso do arquivo: o recorte por dia local depende dele, e o CI roda em UTC.
beforeAll(() => vi.stubEnv('TZ', 'America/Santiago'))
afterAll(() => vi.unstubAllEnvs())

describe('currentCalendarPeriod', () => {
  it('semana corrente num domingo vai da segunda anterior até hoje', () => {
    expect(currentCalendarPeriod('week', new Date(2026, 10, 22))).toEqual({ start: '2026-11-16', end: '2026-11-22' })
  })

  it('semana corrente numa segunda começa nela', () => {
    expect(currentCalendarPeriod('week', new Date(2026, 10, 23))).toEqual({ start: '2026-11-23', end: '2026-11-23' })
  })

  it('mês e ano correntes', () => {
    expect(currentCalendarPeriod('month', new Date(2026, 10, 22)).start).toBe('2026-11-01')
    expect(currentCalendarPeriod('year', new Date(2026, 10, 22)).start).toBe('2026-01-01')
  })

  it('o fim é sempre hoje', () => {
    expect(currentCalendarPeriod('year', new Date(2026, 10, 22)).end).toBe('2026-11-22')
  })
})

describe('isWithinPeriod', () => {
  it('instante perto da meia-noite compara pelo dia local', () => {
    // 02:30Z do dia 23 é 23:30 do dia 22 em Santiago (UTC-3).
    expect(isWithinPeriod('2026-11-23T02:30:00Z', { start: '2026-11-22', end: '2026-11-22' })).toBe(true)
  })

  it('os limites são inclusivos e fora deles recusa', () => {
    const periodo = { start: '2026-11-10', end: '2026-11-20' }
    expect(isWithinPeriod('2026-11-10T12:00:00-03:00', periodo)).toBe(true)
    expect(isWithinPeriod('2026-11-20T12:00:00-03:00', periodo)).toBe(true)
    expect(isWithinPeriod('2026-11-09T12:00:00-03:00', periodo)).toBe(false)
    expect(isWithinPeriod('2026-11-21T12:00:00-03:00', periodo)).toBe(false)
  })

  it('null não recorta', () => {
    expect(isWithinPeriod('2001-01-01T00:00:00Z', null)).toBe(true)
  })
})
