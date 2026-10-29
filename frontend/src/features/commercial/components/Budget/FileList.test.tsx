import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { FileData } from '@shared/types/generated'
import { FileList } from './FileList'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const arquivo = (id: number, type: string): FileData => ({
  id,
  type,
  original_name: `${type}-${id}.pdf`,
  mime: 'application/pdf',
  size: 2048,
  download_url: `http://localhost/arquivo/${id}`,
  created_at: '2026-10-28T10:00:00Z',
})

describe('FileList — tag do tipo (bloco 43)', () => {
  it('com showType, cada linha mostra o tipo', () => {
    renderWithProviders(<FileList files={[arquivo(1, 'invoice'), arquivo(2, 'purchase_order')]} showType />)

    expect(screen.getByText('budget.documentType.invoice')).toBeTruthy()
    expect(screen.getByText('budget.documentType.purchase_order')).toBeTruthy()
  })

  /** Review Focus 4: dado antigo ou de outro fluxo não quebra a lista. */
  it('tipo fora do enum vira tag neutra com o valor cru', () => {
    renderWithProviders(<FileList files={[arquivo(3, 'foo')]} showType />)

    expect(screen.getByText('foo')).toBeTruthy()
  })

  it('sem showType (a lista da cotação), nenhuma tag', () => {
    renderWithProviders(<FileList files={[arquivo(4, 'invoice')]} />)

    expect(screen.queryByText('budget.documentType.invoice')).toBeNull()
  })
})
