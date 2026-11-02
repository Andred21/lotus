import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { postMultipart } from '@shared/api/postMultipart'
import type { QuoteData } from '@shared/types/generated'
import { QuotesList } from './QuotesList'

/**
 * Regressão da revisão final do bloco 47 (I1), lado da cotização: com a
 * mutation REAL recusando, o seletor da linha volta a existir (o Prime só
 * renderiza o `<input>` com o estado de arquivos vazio).
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('@shared/api/postMultipart', () => ({ postMultipart: vi.fn() }))

vi.mock('../../hooks/useQuotesListCourses', () => ({
  useQuotesListCourses: () => ({
    courseName: () => 'Alta tensión',
    hasCourse: () => true,
    isError: false,
    errorDetail: undefined,
    refetch: () => {},
  }),
}))

const COTACAO = {
  id: 1, course_id: 7, status: 'pending', value_uf: '10', student_count: 2, files: [],
} as unknown as QuoteData

describe('QuotesList — envio de arquivo recusado', () => {
  it('o seletor da cotação volta depois de um 422, para escolher outro arquivo', async () => {
    vi.mocked(postMultipart).mockRejectedValueOnce({ detail: 'Tipo de archivo no permitido' })
    const { container } = renderWithProviders(
      <QuotesList
        quotes={[COTACAO]}
        mode="active"
        archived={{ items: [], loading: false, error: null, refetch: () => undefined, restoring: false }}
        onRestore={() => {}}
      />,
    )
    const pdf = new File(['%PDF'], 'cot-1.pdf', { type: 'application/pdf' })

    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [pdf] } })

    await waitFor(() => expect(screen.getByText('Tipo de archivo no permitido')).toBeTruthy())
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1)
  })
})
