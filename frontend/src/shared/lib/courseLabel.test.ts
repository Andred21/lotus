import { describe, expect, it } from 'vitest'
import { courseLabel } from './courseLabel'

describe('courseLabel', () => {
  it('junta código e nome com ponto médio', () => {
    expect(courseLabel({ code: 'C-12', name: 'Altura' })).toBe('C-12 · Altura')
  })

  it('sem código mostra só o nome', () => {
    expect(courseLabel({ code: null, name: 'Altura' })).toBe('Altura')
  })

  it('código ausente (curso criado fora da Action) mostra só o nome', () => {
    expect(courseLabel({ name: 'Altura' })).toBe('Altura')
  })
})
