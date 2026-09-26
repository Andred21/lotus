import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { AdministracionPage } from './AdministracionPage'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

beforeEach(() => {
  vi.spyOn(api, 'get').mockImplementation((() => Promise.resolve({ data: [] })) as never)
})

const montar = () => renderWithProviders(<AdministracionPage />, { route: '/' })

describe('AdministracionPage — régua de abas', () => {
  it('a régua de abas rola quando transborda', () => {
    // Medido no navegador em 390x844: [280, 276, true] (UI-03 do Task 6,
    // remedido no Task 8) — as únicas duas telas (Comercial, Certificados)
    // que não transbordam ficam sem a prop; esta transborda.
    const { container } = montar()
    expect(container.querySelector('.p-tabview-scrollable')).not.toBeNull()
  })
})
