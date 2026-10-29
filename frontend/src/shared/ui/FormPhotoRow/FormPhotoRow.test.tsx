import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { FormPhotoRow } from './FormPhotoRow'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const photo = {
  url: null,
  pending: false,
  error: null,
  onSelect: vi.fn(),
  onRemove: vi.fn(),
  onSizeReject: vi.fn(),
  onRetry: vi.fn(),
} as unknown as Parameters<typeof FormPhotoRow>[0]['photo']

describe('FormPhotoRow', () => {
  /** Revisão final M-3: com 160px o rótulo "Seleccionar foto" quebrava em duas linhas. */
  it('a coluna da foto tem 176px (sm:w-44) para o rótulo caber numa linha', () => {
    const { container } = render(
      <FormPhotoRow name="Ana" photo={photo} readOnly={false}>
        <span>campos</span>
      </FormPhotoRow>,
    )

    const coluna = container.firstElementChild?.firstElementChild
    expect(coluna?.className).toContain('sm:w-44')
    expect(coluna?.className).not.toContain('sm:w-40')
  })
})
