import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { RedatorData } from '@shared/types/generated'
import { RedatorRowActions } from './RedatorRowActions'

// `t` devolve a chave: o que estes casos medem é QUAL botão existe, não a
// tradução dele.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** O RBAC real vem da sessão (`usePermissions` lê o store) — mockar o hook
 * testaria o mock, não a fiação. */
function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const redator: RedatorData = {
  id: 3, name: 'Redactor', rut: '11.111.111-1', email: 'r@lotus.cl', phone: null,
  is_active: true, course_ids: [], documents: [], photo_url: null, last_login: null,
}

function montar(archived: boolean) {
  return render(
    <RedatorRowActions
      redator={redator}
      archived={archived}
      busy={false}
      onView={() => {}}
      onArchive={() => {}}
      onRestore={() => {}}
    />,
  )
}

describe('RedatorRowActions', () => {
  it('arquivar pede identity.user.delete e restaurar pede identity.user.restore', () => {
    comPermissoes(['identity.user.delete'])

    montar(false)
    expect(screen.getByLabelText('archive.archiveAction')).toBeTruthy()

    cleanup()
    montar(true)
    // Só `delete` na sessão: o restore tem guard PRÓPRIO aqui — ao contrário do
    // staff, cujas duas ações caem na mesma permissão segregada.
    expect(screen.queryByText('archive.restoreAction')).toBeNull()

    cleanup()
    comPermissoes(['identity.user.restore'])
    montar(true)
    expect(screen.getByText('archive.restoreAction')).toBeTruthy()
  })

  it('sem identity.user.delete a caixa some, mas o olho fica', () => {
    comPermissoes(['identity.user.view'])

    montar(false)

    expect(screen.queryByLabelText('archive.archiveAction')).toBeNull()
    expect(screen.getByLabelText('common.view')).toBeTruthy()
  })

  it('em arquivados o olho SAI: o show nao enxerga soft-deletado', () => {
    comPermissoes(['identity.user.restore'])

    montar(true)

    expect(screen.queryByLabelText('common.view')).toBeNull()
  })
})
