import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { BudgetDetailPage } from './BudgetDetailPage'

/**
 * Irmão do `BudgetDetailPage.test.tsx` (titulação por ramo): aqui o ramo com
 * orçamento, e só o gatilho do cabeçalho. O botão abre a confirmação de ARQUIVAR
 * (as cotações vão junto, Restaurar desfaz), e o toast diz "arquivado": o rótulo
 * "Eliminar" prometia o que não acontece (C-4).
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type BudgetDetail = ReturnType<typeof useBudgetDetail>

const askDeleteBudget = vi.fn()
const detail = vi.hoisted<{ current: Partial<BudgetDetail> }>(() => ({ current: {} }))
vi.mock('../../hooks/useBudgetDetail', () => ({
  useBudgetDetail: () => detail.current as BudgetDetail,
}))
vi.mock('../../hooks/useBudgetQuotesArchived', () => ({ useBudgetQuotesArchived: () => ({}) }))
// Têm teste próprio; o que se prova aqui é o cabeçalho.
vi.mock('./BudgetQuotesCard', () => ({ BudgetQuotesCard: () => null }))
vi.mock('./BudgetDocumentsCard', () => ({ BudgetDocumentsCard: () => null }))
vi.mock('./BudgetOverlays', () => ({ BudgetOverlays: () => null }))

function renderPage() {
  detail.current = {
    goBack: () => {},
    loading: false,
    loadError: null,
    budget: { id: 1, code: 'Scap 1', status: 'pending', quotes: [], files: [] } as unknown as BudgetDetail['budget'],
    askDeleteBudget,
  }
  return render(
    <MemoryRouter initialEntries={['/comercial/presupuestos/1']}>
      <BudgetDetailPage />
    </MemoryRouter>,
  )
}

describe('BudgetDetailPage — o gatilho de arquivar (C-4)', () => {
  it('o botão do cabeçalho diz Arquivar, não Eliminar, e abre a confirmação', () => {
    renderPage()

    expect(screen.queryByRole('button', { name: 'common.delete' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'archive.archiveAction' }))
    expect(askDeleteBudget).toHaveBeenCalled()
  })

  it('o gatilho tem o tom de aviso do diálogo de arquivar, não o de perigo', () => {
    renderPage()

    const botao = screen.getByRole('button', { name: 'archive.archiveAction' })
    expect(botao.className).toContain('p-button-warning')
    expect(botao.className).not.toContain('p-button-danger')
  })
})
