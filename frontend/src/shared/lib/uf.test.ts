import { describe, expect, it } from 'vitest'
import { formatUf, formatUfField, isAmbiguousUfInput, parseUfInput } from './uf'

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
    // Três casas decimais com até três dígitos inteiros seriam a forma ambígua
    // que o campo recusa: o pré-preenchimento mantém a quarta casa.
    expect(formatUfField('12.3450')).toBe('12,3450')
  })
})

describe('formatUfField + parseUfInput (round-trip do campo em edição)', () => {
  it.each([
    ['1234.0000', '1234'],
    ['12345.5000', '12345.5'],
    ['100000.0000', '100000'],
    ['0.0000', '0'],
    ['12.3450', '12.3450'],
  ])('%s volta canônico como %s', (entrada, canonico) => {
    expect(parseUfInput(formatUfField(entrada))).toBe(canonico)
  })
})

// Q-2 da revisão do bloco 66: "1,500" é mil e quinhentos para quem lê em inglês
// e 1,5 para o parser. Valor rejeitado é aceitável; valor silenciosamente errado,
// não. O campo recusa a forma que nenhuma convenção decide sozinha.
describe('isAmbiguousUfInput', () => {
  it.each(['1,500', '1.500', '12,345', '999.000', ' 1,500 '])('%s é ambíguo', (raw) => {
    expect(isAmbiguousUfInput(raw)).toBe(true)
  })

  it.each(['1.500.000', '1,500,000', '2.000.000'])('%s repete o separador que seria o decimal', (raw) => {
    expect(isAmbiguousUfInput(raw)).toBe(true)
  })

  it.each(['1500', '1,5', '1.5', '1,50', '1,5000', '1234,567', '1.250,75', '1,250.75', '0,125', '', '12,3450'])(
    '%s não é ambíguo',
    (raw) => {
      expect(isAmbiguousUfInput(raw)).toBe(false)
    },
  )

  it('todo valor que o campo pré-preenche passa pela própria recusa', () => {
    for (const gravado of ['1.5000', '12.3450', '999.1230', '0.1250', '1234.5670', '1500.0000']) {
      expect(isAmbiguousUfInput(formatUfField(gravado))).toBe(false)
    }
  })
})
