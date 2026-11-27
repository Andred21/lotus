import { describe, expect, it } from 'vitest'
import { formatUf, formatUfField, parseUfInput } from './uf'

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

  it('valor do campo: sem agrupar milhar, vírgula decimal, zeros à direita cortados', () => {
    expect(formatUfField('1234.0000')).toBe('1234')
    expect(formatUfField('12.3450')).toBe('12,345')
  })
})

describe('formatUfField + parseUfInput (round-trip do campo em edição)', () => {
  it.each([
    ['1234.0000', '1234'],
    ['12345.5000', '12345.5'],
    ['100000.0000', '100000'],
    ['0.0000', '0'],
    ['12.3450', '12.345'],
  ])('%s volta canônico como %s', (entrada, canonico) => {
    expect(parseUfInput(formatUfField(entrada))).toBe(canonico)
  })
})
