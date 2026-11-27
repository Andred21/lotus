import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordCode } from './RecordCode'

/**
 * O código de registro (`Scap 100`, `Scap 2 - R1`, `C-7`) saía em quatro cópias
 * literais de `font-bold text-sm` + `--primary-color` e, no curso e na fila de
 * cotizações da Operação, em mono cinza. O João pediu a mesma grafia do Scap da
 * tabela de presupuestos em todos (bloco 60, 2026-11-23).
 */
describe('RecordCode', () => {
  it('RecordCode é 600', () => {
    render(<RecordCode>Scap 100</RecordCode>)

    const codigo = screen.getByText('Scap 100')
    expect(codigo.className).toContain('font-semibold')
    expect(codigo.className).not.toContain('font-bold')
  })

  it('sai no corpo da tabela e na cor primária do tema', () => {
    render(<RecordCode>Scap 100</RecordCode>)

    const codigo = screen.getByText('Scap 100')
    expect(codigo.className).toContain('text-sm')
    expect(codigo.style.color).toBe('var(--primary-color)')
  })

  it('não é mono: a fonte é a mesma do Scap da tabela', () => {
    render(<RecordCode>C-7</RecordCode>)

    expect(screen.getByText('C-7').className).not.toContain('font-mono')
  })

  it('aceita classe de layout de quem compõe', () => {
    render(<RecordCode className="whitespace-nowrap">Scap 2 - R1</RecordCode>)

    expect(screen.getByText('Scap 2 - R1').className).toContain('whitespace-nowrap')
  })
})
