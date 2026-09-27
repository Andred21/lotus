import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { UserData } from '@shared/types/generated'
import { StaffUserDialog } from './StaffUserDialog'

// `t` devolve a chave, como o `mockUseTranslation`: o que se prova é QUAL
// texto o campo Rol usa (a chave `roleName.*`), não a tradução dele.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const USER: UserData = {
  id: 1, uuid: 'u-1', name: 'Admin Lotus', email: 'admin@lotus.cl', rut: null, phone: null,
  role: 'admin', is_active: true, password: undefined, type: 'admin', roles: ['admin'],
  photo_url: null, last_login: null,
}

const PHOTO = {
  url: null, pending: false, error: null, hasBufferedFailure: false,
  onSelect: () => {}, onRemove: () => {}, onSizeReject: () => {}, onRetry: () => {},
}

// `readOnly` MUTÁVEL: o campo Rol só mostra o `value` de leitura (ReadOnlyValue,
// `FormField.tsx`) quando `readOnly` é `true`, e só monta o `<AppDropdown>`
// (com as opções) quando é `false` — os dois ramos do MESMO `campo.Field`, e um
// teste por ramo. `StaffUserDialog` monta o form pelo hook da feature e as
// opções de role por outro — mock direto dos dois, molde de
// `RedatorCourseSelector.test.tsx`. O que este arquivo prova é o campo Rol
// (leitura + opções), não os hooks em si (isso é do
// `useStaffUserForm.test.tsx`/`useStaffRoleOptions.test.tsx`).
let readOnly = true
vi.mock('../../hooks/useStaffUserForm', () => ({
  useStaffUserForm: () => ({
    form: { ...USER, rut: '', phone: '', password: '' },
    set: () => {},
    get readOnly() {
      return readOnly
    },
    submit: () => {},
    pending: false,
    busy: false,
    photo: PHOTO,
    fieldErrors: null,
    generalError: null,
    errorSummary: {},
  }),
}))

// As opções que `useStaffRoleOptions` monta com `roleLabel` — cobertas à parte
// em `useStaffRoleOptions.test.tsx`. Aqui a forma é fixa e conhecida: label
// traduzido, value o slug. O rótulo de "admin" é deliberadamente DIFERENTE do
// que `roleLabel` devolveria (`roleName.admin`): assim o teste de leitura abaixo
// prova que o `value=` do diálogo chama `roleLabel` ele mesmo, e não apenas
// devolve o que a lista de opções já trouxe pronto — as duas chamadas são
// independentes no componente (achado do review: cobertura só existia para o
// wrapper `roles.ts`, não para os DOIS call sites deste arquivo).
vi.mock('../../hooks/useStaffRoleOptions', () => ({
  useStaffRoleOptions: () => ({
    roleOptions: [
      { label: 'ADMIN (rótulo da lista, não usado na leitura)', value: 'admin' },
      { label: 'roleName.superadmin', value: 'superadmin' },
      { label: 'auditor', value: 'auditor' },
    ],
  }),
}))

describe('StaffUserDialog — campo Rol (UI-01)', () => {
  it('em leitura, o valor sai por roleLabel — role de sistema mostra a chave roleName, não o slug (nem o rótulo da lista de opções)', () => {
    readOnly = true
    renderWithProviders(
      <StaffUserDialog visible mode="view" user={USER} canManage={false} onHide={() => {}} />,
    )

    expect(screen.getByText('roleName.admin')).toBeTruthy()
    expect(screen.queryByText('admin')).toBeNull()
    expect(screen.queryByText('ADMIN (rótulo da lista, não usado na leitura)')).toBeNull()
  })

  it('editável, as opções do dropdown trazem a label traduzida', () => {
    readOnly = false
    renderWithProviders(
      <StaffUserDialog visible mode="edit" user={USER} canManage onHide={() => {}} />,
    )

    // O `Dialog` do Prime monta em portal, fora do container do render — o
    // painel do dropdown se lê no `document`, como `AppDropdown.test.tsx` já
    // fazia.
    fireEvent.click(document.querySelector('.p-dropdown') as HTMLElement)
    const itens = Array.from(document.querySelectorAll('.p-dropdown-item')).map((li) => li.textContent)

    expect(itens).toEqual([
      'ADMIN (rótulo da lista, não usado na leitura)', 'roleName.superadmin', 'auditor',
    ])
  })
})
