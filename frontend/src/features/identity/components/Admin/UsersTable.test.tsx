import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { UserData } from '@shared/types/generated'
import { UsersTable } from './UsersTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const user: UserData = {
  id: 1, uuid: 'u-1', name: 'Admin Lotus', email: 'admin@lotus.cl', rut: null, phone: null,
  role: 'superadmin', is_active: true, password: undefined, type: 'admin', roles: ['superadmin'],
  photo_url: null, last_login: null,
}

describe('UsersTable', () => {
  it('a coluna Rol imprime o rótulo do role, não o slug (UI-01)', () => {
    renderWithProviders(
      <UsersTable
        users={[user]} loading={false} onView={() => {}} mode="active" onModeChange={() => {}}
        onArchive={() => {}} onRestore={() => {}} busy={false}
      />,
    )
    expect(screen.getByText('roleName.superadmin')).toBeTruthy()
    expect(screen.queryByText('superadmin')).toBeNull()
  })
})
