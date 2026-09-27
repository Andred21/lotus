import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { RoleData } from '@shared/types/generated'
import { RoleDialog } from './RoleDialog'

// `t` devolve a chave, como o `mockUseTranslation`: o que se prova é QUAL
// texto o título usa (a chave `roleName.*`), não a tradução dele.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// `RoleDialog` monta o form pelo hook da feature — mock direto, molde de
// `RedatorCourseSelector.test.tsx`. O que este teste prova é o TÍTULO do
// diálogo, não o form em si (isso é do `useRoleForm.test.tsx`).
const FORM_BASE = {
  form: { id: 1, name: 'redator', permissions: ['identity.access.view'] },
  set: () => {},
  toggle: () => {},
  readOnly: true,
  submit: () => {},
  pending: false,
  fieldErrors: null,
  generalError: null,
  errorSummary: {},
}
vi.mock('../../hooks/useRoleForm', () => ({
  useRoleForm: () => FORM_BASE,
}))

// Catálogo de permissões: fora do escopo deste teste (título), então devolve
// vazio em vez de bater na rede de verdade.
vi.mock('../../api/usePermissionCatalog', () => ({
  usePermissionCatalog: () => ({ data: [] }),
}))

const ROLE_REDATOR: RoleData = { id: 1, name: 'redator', permissions: ['identity.access.view'], is_system: true }

describe('RoleDialog — título (UI-01)', () => {
  it('mode view: o título sai por roleLabel — role de sistema mostra a chave roleName, não o slug', () => {
    renderWithProviders(
      <RoleDialog visible mode="view" role={ROLE_REDATOR} canManage={false} onHide={() => {}} />,
    )

    expect(screen.getByText('roleName.redator')).toBeTruthy()
    expect(screen.queryByText('redator', { selector: 'h2, [role="heading"]' })).toBeNull()
  })

  it('mode create: o título continua o de "role novo", roleLabel nem entra em jogo', () => {
    renderWithProviders(
      <RoleDialog visible mode="create" role={null} canManage onHide={() => {}} />,
    )

    expect(screen.getByText('role.new')).toBeTruthy()
  })
})
