import { describe, expect, it } from 'vitest'
import { formatUf } from './uf'

describe('formatUf', () => {
  it('es-CL agrupa milhar com ponto e decimal com vírgula', () => {
    expect(formatUf('12345.6700', 'es-CL')).toBe('12.345,67')
  })

  it('en usa vírgula e ponto', () => {
    expect(formatUf('12345.6700', 'en')).toBe('12,345.67')
  })

  it('zeros à direita somem', () => {
    expect(formatUf('1.0000', 'es-CL')).toBe('1')
    expect(formatUf('0.0000', 'es-CL')).toBe('0')
  })

  it('valor negativo mantém o sinal', () => {
    expect(formatUf('-1500.5000', 'es-CL')).toBe('-1.500,5')
  })
})
