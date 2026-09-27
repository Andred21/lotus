import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { api } from '@shared/api/axios'
import { createWrapper } from '@shared/testing/providers'
import { useStaffRoleOptions } from './useStaffRoleOptions'

// `t` devolve a chave, como o `mockUseTranslation`: o que se prova é QUAL
// texto a opção usa (a chave `roleName.*`), não a tradução dele.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

describe('useStaffRoleOptions', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('a label sai por roleLabel (chave roleName para role de sistema), o value continua o slug (UI-01)', async () => {
    get.mockResolvedValue({
      data: [
        { id: 1, name: 'superadmin', permissions: [], is_system: true },
        { id: 2, name: 'admin', permissions: [], is_system: true },
        { id: 3, name: 'redator', permissions: [], is_system: true },
        { id: 4, name: 'auditor', permissions: [], is_system: false },
      ],
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useStaffRoleOptions(), { wrapper })

    await waitFor(() => expect(result.current.roleOptions.length).toBeGreaterThan(0))

    // `redator` tem tela própria (RN-01) e não entra nas opções de staff.
    expect(result.current.roleOptions).toEqual([
      { label: 'roleName.superadmin', value: 'superadmin' },
      { label: 'roleName.admin', value: 'admin' },
      { label: 'auditor', value: 'auditor' },
    ])
  })
})
