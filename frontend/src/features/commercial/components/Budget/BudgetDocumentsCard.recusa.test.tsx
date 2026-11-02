import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { postMultipart } from '@shared/api/postMultipart'
import { BudgetDocumentsCard } from './BudgetDocumentsCard'

/**
 * Regressão da revisão final do bloco 47 (I1): no modo básico o Prime não
 * renderiza o `<input type=file>` enquanto guarda um arquivo. Com a mutation
 * REAL recusando (422), o seletor só volta se o `clear()` rodar antes da
 * chamada, e não só no sucesso.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('@shared/api/postMultipart', () => ({ postMultipart: vi.fn() }))

describe('BudgetDocumentsCard — envio recusado', () => {
  it('o seletor do slot volta depois de um 422, para escolher outro arquivo', async () => {
    vi.mocked(postMultipart).mockRejectedValueOnce({ detail: 'Tipo de archivo no permitido' })
    const { container } = renderWithProviders(
      <BudgetDocumentsCard budgetId={7} files={[]} onRemove={() => {}} fileError={null} />,
    )
    const pdf = new File(['%PDF'], 'fa-1.pdf', { type: 'application/pdf' })

    fireEvent.change(container.querySelectorAll('input[type="file"]')[1], { target: { files: [pdf] } })

    await waitFor(() => expect(screen.getByText('Tipo de archivo no permitido')).toBeTruthy())
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(3)
  })
})
