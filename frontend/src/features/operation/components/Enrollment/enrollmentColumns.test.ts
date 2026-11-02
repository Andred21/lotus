import { describe, expect, it } from 'vitest'
import { archivedEnrollmentWidths, enrollmentWidths } from './enrollmentColumns'

/**
 * P-101: com `identifierClass` o RUT parou de quebrar no hífen, mas o `COL.rut`
 * (peso 9) não dava a ele a caixa que ele ocupa. Medido no navegador
 * (`docs/superpowers/blocos/49-frontend-acessibilidade-e-respiro/prova.md`): o RUT
 * em mono mede 101px e a célula soma 32px de padding, 133px de caixa. A tabela
 * ativa assenta em 640px a 390 de viewport e a de arquivados em 504px, então a
 * fatia mínima é 133/640 e 133/504. `table-layout: fixed` ignora `min-width`, por
 * isso a garantia é a fatia, e é ela que este teste prende.
 */
const pct = (largura: string | number | undefined) => parseFloat(String(largura))

describe('a coluna RUT das matrículas cabe o RUT em mono (P-101)', () => {
  it.each([true, false])('tabela ativa, com ação = %s', (actions) => {
    expect(pct(enrollmentWidths(actions).rut.width)).toBeGreaterThanOrEqual((133 / 640) * 100)
  })

  it.each([true, false])('arquivadas, com ação = %s', (actions) => {
    expect(pct(archivedEnrollmentWidths(actions).rut.width)).toBeGreaterThanOrEqual((133 / 504) * 100)
  })
})
