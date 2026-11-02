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

describe('FileList — outros documentos do orçamento', () => {
  /** Review Focus 4 (bloco 43): dado antigo ou de outro fluxo não quebra a lista. */
  it('tipo fora do enum vira tag neutra com o valor cru', () => {
    renderWithProviders(<FileList files={[arquivo(3, 'foo')]} />)

    expect(screen.getByText('foo').className).toContain('p-tag')
    expect(screen.getByText('foo-3.pdf')).toBeTruthy()
  })

  it('cada arquivo tem ver e baixar; excluir só com onRemove', () => {
    const { unmount } = renderWithProviders(<FileList files={[arquivo(3, 'foo')]} />)
    expect(screen.getAllByRole('button', { name: 'common.preview' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'common.download' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'common.delete' })).toBeNull()
    unmount()

    renderWithProviders(<FileList files={[arquivo(3, 'foo')]} onRemove={() => {}} />)
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeTruthy()
  })
})
