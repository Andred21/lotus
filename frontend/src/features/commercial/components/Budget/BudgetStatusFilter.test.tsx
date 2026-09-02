import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetStatusFilter } from './BudgetStatusFilter'

/**
 * UI-02 da run de Comercial (2026-08-25, achado B): o dropdown de estado dos
 * presupuestos expunha só o VALOR corrente ("Todos") — sem `aria-label`, sem
 * `aria-labelledby` e sem `<label>` nenhum. É o mesmo defeito que o UI-07 da
 * run de Operação já tinha pago no irmão `TurmaStatusFilter`, e a prova aqui é
 * a mesma: pelo NOME ACESSÍVEL, e não pela existência de um `<label>` no DOM —
 * um `<label>` sem `htmlFor`, ou apontando para o nó raiz do Dropdown em vez do
 * `inputId`, passaria batido num teste que só buscasse a tag.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

describe('BudgetStatusFilter — o filtro de estado tem nome acessível (UI-02)', () => {
  it('o dropdown se acha pelo rótulo, não só pelo valor corrente', () => {
    render(<BudgetStatusFilter value={null} onChange={() => {}} />)

    // Sob o mock de i18n, `t` devolve a CHAVE: a mesma de `budget.status` que
    // já titula a coluna ESTADO da tabela.
    expect(screen.getByLabelText('budget.status')).toBeTruthy()
  })
})
