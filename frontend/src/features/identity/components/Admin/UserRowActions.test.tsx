import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { UserData } from '@shared/types/generated'
import { UserRowActions } from './UserRowActions'

// `t` devolve a chave: o que estes casos medem é QUAL botão existe, não a
// tradução dele — pinar o texto traduzido faria o teste quebrar ao mexer no
// locale, que não é o defeito que ele guarda.
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(() => {
  cleanup()
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

const user: UserData = {
  id: 7, uuid: 'u-7', name: 'Staff', email: 's@lotus.cl', rut: null, phone: null,
  role: 'admin', is_active: true, password: undefined, type: 'admin', roles: ['admin'],
  photo_url: null, last_login: null,
}

function montar(archived: boolean) {
  return render(
    <UserRowActions
      user={user}
      archived={archived}
      busy={false}
      onView={() => {}}
      onArchive={() => {}}
      onRestore={() => {}}
    />,
  )
}

describe('UserRowActions', () => {
  it('guarda arquivar E restaurar pela MESMA permissao segregada (spec D7)', () => {
    // `identity.user.delete`/`identity.user.restore` são as do REDATOR e não
    // valem aqui: se valessem, um admin comum devolveria um staff que nunca
    // teria podido arquivar.
    comPermissoes(['identity.user.view', 'identity.user.delete', 'identity.user.restore'])

    montar(false)
    expect(screen.queryByLabelText('archive.archiveAction')).toBeNull()

    cleanup()
    montar(true)
    expect(screen.queryByText('archive.restoreAction')).toBeNull()
  })

  it('com identity.access.manage as duas acoes aparecem', () => {
    comPermissoes(['identity.access.manage'])

    montar(false)
    expect(screen.getByLabelText('archive.archiveAction')).toBeTruthy()

    cleanup()
    montar(true)
    expect(screen.getByText('archive.restoreAction')).toBeTruthy()
  })

  it('em arquivados o olho SAI: o show nao enxerga soft-deletado', () => {
    comPermissoes(['identity.access.manage'])

    montar(true)

    expect(screen.queryByLabelText('common.view')).toBeNull()
  })
})
