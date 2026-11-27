import { describe, expect, it } from 'vitest'
import { turmaTabPath } from './turmaTabs'

describe('turmaTabPath', () => {
  it('leva a turma e a aba na URL', () => {
    expect(turmaTabPath(4, 'docs')).toBe('/operacion/turmas/4?tab=docs')
  })
})
