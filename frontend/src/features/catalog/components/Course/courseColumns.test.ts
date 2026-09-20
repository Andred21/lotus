import { describe, expect, it } from 'vitest'
import { COL, tableWidths } from '@shared/ui'
import { courseWidths } from './courseColumns'

describe('courseWidths', () => {
  it('reserva a "Redactores" a largura de um texto curto, não a de um numeral (UI-01)', () => {
    const esperado = tableWidths(
      { name: COL.text, technicalName: COL.short, workload: COL.count, redatorCount: COL.short },
      { archived: false },
    )
    expect(courseWidths(false).redatorCount).toEqual(esperado.redatorCount)
  })
})
