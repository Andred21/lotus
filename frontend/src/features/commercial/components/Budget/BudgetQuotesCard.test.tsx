import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { useBudgetQuotesArchived } from '../../hooks/useBudgetQuotesArchived'
import { BudgetQuotesCard } from './BudgetQuotesCard'

// `t` devolve a própria chave — mesma convenção de `QuotesList.test.tsx` e
// `RoleDialog.test.tsx`: o que se prova é QUE chave nomeia o botão, não o
// texto em espanhol que só existe em runtime real.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// `QuotesList` (filho deste card) chama estes dois hooks de verdade — sem
// mock eles batem em `useQuery`/`useMutation` fora de qualquer componente
// deste teste tocar rede (molde de `QuotesList.test.tsx`).
vi.mock('../../hooks/useQuotesListCourses', () => ({
  useQuotesListCourses: () => ({
    courseName: () => 'Alta tensión',
    hasCourse: () => true,
    isError: false,
    errorDetail: undefined,
    refetch: () => {},
  }),
}))

vi.mock('../../hooks/useQuoteFiles', () => ({
  useQuoteFiles: () => ({
    fileError: null,
    sizeError: null,
    isUploading: () => false,
    upload: () => {},
    remove: () => {},
    setSizeError: () => {},
  }),
}))

type QuotesArchived = ReturnType<typeof useBudgetQuotesArchived>

/** Forma mínima do retorno de `useBudgetQuotesArchived` (mesmos campos do
 * mock em `BudgetDetailPage.test.tsx`), com `setMode` substituível por espião. */
function quotesArchivedFixture(over: Partial<QuotesArchived> = {}): QuotesArchived {
  return {
    mode: 'active',
    setMode: vi.fn(),
    items: [],
    loading: false,
    error: null,
    refetch: () => Promise.resolve(),
    restore: () => {},
    restoring: false,
    ...over,
  }
}

function renderCard(over: Partial<QuotesArchived> = {}) {
  const quotesArchived = quotesArchivedFixture(over)
  renderWithProviders(
    <BudgetQuotesCard
      title="budget.quotes"
      count={0}
      quotes={[]}
      quotesArchived={quotesArchived}
      onEdit={() => {}}
      onRemove={() => {}}
    />,
  )
  return quotesArchived
}

describe('BudgetQuotesCard — alternador no cabeçalho (D-59)', () => {
  it('(a) o alternador aparece no cabeçalho do card mesmo sem cotação ativa', () => {
    renderCard()

    // As duas opções do `ArchiveSwitch` — a régua própria da lista morreu
    // (Task 9), então achar o botão aqui só é possível se o `actions` do
    // `AppCardHeader` estiver de fato ligado.
    expect(screen.getByRole('button', { name: /archive\.active/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /archive\.archived/i })).toBeTruthy()
  })

  it('(b) clicar em Archivados chama setMode com "archived"', () => {
    const quotesArchived = renderCard()

    const arquivados = screen.getByRole('button', { name: /archive\.archived/i })
    fireEvent.click(arquivados)

    expect(quotesArchived.setMode).toHaveBeenCalledWith('archived')
  })

  it('(c) com mode "archived", o switch reflete o valor — Archivados contornado, Activos texto', () => {
    renderCard({ mode: 'archived' })

    const ativos = screen.getByRole('button', { name: /archive\.active/i })
    const arquivados = screen.getByRole('button', { name: /archive\.archived/i })

    expect(arquivados.className).toContain('p-button-outlined')
    expect(ativos.className).toContain('p-button-text')
  })
})
