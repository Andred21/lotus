import { describe, it, expect } from 'vitest'
import { COL, ARCHIVED_COLUMN, tableWidths } from './columnWidth'

const soma = (larguras: Record<string, { width?: string | number }>) =>
  Math.round(
    Object.values(larguras).reduce((total, l) => total + parseFloat(String(l.width)), 0) * 100,
  ) / 100

describe('tableWidths', () => {
  it('fecha o orçamento padrão de 90% em qualquer aridade', () => {
    expect(soma(tableWidths({ a: COL.identity, b: COL.rut, c: COL.tag }))).toBe(90)
    expect(soma(tableWidths({ a: COL.code, b: COL.identity, c: COL.count, d: COL.money, e: COL.tag }))).toBe(90)
    expect(
      soma(
        tableWidths({
          a: COL.code, b: COL.text, c: COL.identity, d: COL.tag,
          e: COL.identity, f: COL.count, g: COL.tag,
        }),
      ),
    ).toBe(90)
  })

  it('desconta o rastreio de arquivados do orçamento', () => {
    expect(soma(tableWidths({ a: COL.identity, b: COL.rut }, { archived: true }))).toBe(66)
    expect(soma(ARCHIVED_COLUMN)).toBe(24)
  })

  it('usa os 100% quando a tabela não tem coluna de ação', () => {
    expect(soma(tableWidths({ a: COL.text, b: COL.count, c: COL.count }, { acao: false }))).toBe(100)
  })

  it('reparte na proporção dos pesos', () => {
    const l = tableWidths({ grande: { peso: 20 }, pequena: { peso: 10 } })
    expect(parseFloat(l.grande.width as string)).toBeCloseTo(parseFloat(l.pequena.width as string) * 2, 1)
  })

  it('dá teto só à classe que trunca', () => {
    const l = tableWidths({ nome: COL.identity, rut: COL.rut })
    expect(l.nome.maxWidth).toBe(l.nome.width)
    expect(l.rut.maxWidth).toBeUndefined()
  })
})
