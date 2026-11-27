import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { BudgetData, QuoteData } from '@shared/types/generated'
import type { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { BudgetOverlays } from './BudgetOverlays'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts ? `${key}|${JSON.stringify(opts)}` : key),
    }),
  }
})

type Detail = ReturnType<typeof useBudgetDetail>

const budget = { id: 5, code: 'Scap 5' } as BudgetData
const quote = { id: 9, code: 'Scap 5-1' } as QuoteData

const render_ = (over: Partial<Detail>) =>
  render(<BudgetOverlays d={{ ...over } as Detail} budgetId={5} budget={budget} />)

describe('BudgetOverlays — confirmação nomeada (C-4)', () => {
  it.each(['approve', 'reject', 'remove'] as const)('a confirmação de %s nomeia a cotação pelo folio', (action) => {
    render_({ confirm: { action, quote } })

    expect(screen.getByRole('dialog').textContent).toContain('"code":"Scap 5-1"')
  })

  it('cotação sem folio sai com "—", não com o nome em branco', () => {
    render_({ confirm: { action: 'approve', quote: { id: 9 } as QuoteData } })

    expect(screen.getByRole('dialog').textContent).toContain('"code":"—"')
  })

  it('remover orçamento usa o texto de arquivar e não danger', () => {
    render_({ confirmDeleteBudget: true })

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('archive.confirmArchiveTitle|{"name":"Scap 5"}')
    expect(dialog.textContent).toContain('archive.confirmArchiveBody|{"name":"Scap 5"}')
    expect(dialog.textContent).not.toContain('budget.confirmDeleteTitle')
    expect(screen.getByRole('button', { name: /archive.archiveAction/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /common.delete/ })).toBeNull()
    expect(document.querySelector('[data-severity]')?.getAttribute('data-severity')).not.toBe('danger')
  })

  it('arquivar o orçamento dispara a ação do hook e mostra o erro do gate no diálogo', () => {
    const deleteBudget = vi.fn()
    render_({ confirmDeleteBudget: true, deleteBudget, removeBudgetError: 'sem permissão' })

    expect(screen.getByRole('dialog').textContent).toContain('sem permissão')
    fireEvent.click(screen.getByRole('button', { name: /archive.archiveAction/ }))
    expect(deleteBudget).toHaveBeenCalled()
  })
})
