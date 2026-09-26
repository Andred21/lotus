import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { RoleData } from '@shared/types/generated'
import { RolesTable } from './RolesTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const roles: RoleData[] = [
  { id: 1, name: 'redator', permissions: ['a'], is_system: true },
  { id: 2, name: 'auditor', permissions: [], is_system: false },
]

describe('RolesTable', () => {
  it('o nome do role de sistema sai traduzido, e o customizado sai como foi digitado (UI-01)', () => {
    renderWithProviders(<RolesTable roles={roles} loading={false} onView={() => {}} />)
    expect(screen.getByText('roleName.redator')).toBeTruthy()
    expect(screen.queryByText('redator')).toBeNull()
    expect(screen.getByText('auditor')).toBeTruthy()
  })
})
