import { describe, expect, it } from 'vitest'
import { parseImportRefusals } from './importRefusals'

describe('parseImportRefusals', () => {
  it('separa a recusa da linha da recusa só do Actualizar', () => {
    const parsed = parseImportRefusals({
      'import.5': ['RUT duplicado'],
      'import.7.update': ['Sin permiso para actualizar'],
    })

    expect(parsed?.row).toEqual(new Map([[5, 'RUT duplicado']]))
    expect(parsed?.update).toEqual(new Map([[7, 'Sin permiso para actualizar']]))
  })

  it('ignora chave que não é de linha de importação', () => {
    const parsed = parseImportRefusals({ 'rows.0.email': ['inválido'], 'import.3': ['x'] })

    expect(parsed?.row).toEqual(new Map([[3, 'x']]))
    expect(parsed?.update.size).toBe(0)
  })

  it('devolve null sem nenhuma chave import.*', () => {
    expect(parseImportRefusals({ 'rows.0.email': ['inválido'] })).toBeNull()
    expect(parseImportRefusals({})).toBeNull()
    expect(parseImportRefusals(undefined)).toBeNull()
  })
})
