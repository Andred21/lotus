import { describe, expect, it } from 'vitest'
import { formatRutInput, isRutValid } from './rut'

describe('formatRutInput', () => {
  it('põe pontos e hífen num RUT só de dígitos', () => {
    expect(formatRutInput('123456785')).toBe('12.345.678-5')
  })

  it('é idempotente sobre um RUT já formatado (ponto a mais não duplica)', () => {
    expect(formatRutInput('12.345.678-5')).toBe('12.345.678-5')
    expect(formatRutInput('12..345.678-5')).toBe('12.345.678-5')
  })

  it('ignora espaço e devolve o DV `k` em maiúscula', () => {
    expect(formatRutInput(' 12..345.678 - k')).toBe('12.345.678-K')
  })

  it('RUT de 7 dígitos + DV sai sem ponto duplicado', () => {
    expect(formatRutInput('12345678')).toBe('1.234.567-8')
  })

  it('formata progressivamente', () => {
    expect(formatRutInput('')).toBe('')
    expect(formatRutInput('1')).toBe('1')
    expect(formatRutInput('1234')).toBe('123-4')
  })

  it('corta o que passa de oito dígitos mais o DV', () => {
    expect(formatRutInput('1234567890')).toBe('12.345.678-9')
  })

  it('só aceita K na última posição', () => {
    expect(formatRutInput('1k2')).toBe('1-2')
  })
})

describe('isRutValid', () => {
  it('aceita o RUT de DV correto, com ou sem pontuação', () => {
    expect(isRutValid('12.345.678-5')).toBe(true)
    expect(isRutValid('123456785')).toBe(true)
  })

  it('recusa o DV errado', () => {
    expect(isRutValid('12.345.678-4')).toBe(false)
  })

  it('aceita DV K e DV 0', () => {
    expect(isRutValid('6.000.000-K')).toBe(true)
    expect(isRutValid('7.000.000-K')).toBe(false)
    expect(isRutValid('76.123.456-0')).toBe(true)
  })

  it('recusa vazio e corpo sem dígito', () => {
    expect(isRutValid('')).toBe(false)
    expect(isRutValid('K')).toBe(false)
  })
})
