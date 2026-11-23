import { describe, expect, it } from 'vitest'
import { formatPhoneDisplay } from './phone'

describe('formatPhoneDisplay', () => {
  it('formata o celular chileno em formato internacional', () => {
    // O brief pedia `+56912345678`: a metadata da libphonenumber-js não tem
    // máscara para a faixa `91`, que a API também recusa (Task 15). Vale a `98`.
    expect(formatPhoneDisplay('+56987654321')).toBe('+56 9 8765 4321')
  })

  it('formata o fixo de Santiago', () => {
    expect(formatPhoneDisplay('+56221234567')).toBe('+56 2 2123 4567')
  })

  it('vazio vira string vazia', () => {
    expect(formatPhoneDisplay(null)).toBe('')
    expect(formatPhoneDisplay(undefined)).toBe('')
    expect(formatPhoneDisplay('  ')).toBe('')
  })

  it('devolve o valor cru quando não parseia', () => {
    expect(formatPhoneDisplay('abc')).toBe('abc')
  })
})
