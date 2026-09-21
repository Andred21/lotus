import { describe, expect, it } from 'vitest'
import { COL, tableWidths } from '@shared/ui'
import { redatorWidths } from './redatorColumns'

describe('redatorWidths', () => {
  it('reserva ao RUT a largura de um texto curto, não a do vocabulário `rut` original — em 1024x768 com 5 colunas de dado ele vazava sobre "Cursos habilitados" (UI-02)', () => {
    const esperado = tableWidths(
      {
        name: COL.identity,
        rut: COL.short,
        courses: COL.count,
        suitability: COL.tag,
        lastLogin: COL.dateTime,
      },
      { archived: false },
    )
    expect(redatorWidths(false).rut).toEqual(esperado.rut)
  })
})
