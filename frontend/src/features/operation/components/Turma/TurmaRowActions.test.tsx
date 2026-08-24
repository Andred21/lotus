import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { TurmaData } from '@shared/types/generated'
import { TurmaRowActions } from './TurmaRowActions'

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

const turma: TurmaData = {
  id: 7, quote_id: 1, course_id: 1, modalidade: 'presencial', local_aplicacao: null,
  start_date: '2026-01-01', end_date: '2026-02-01', status: 'em_andamento', habilitada: false,
  missing_document_types: [], concluded_at: null, redatores: [], course_name: 'Curso',
  client_name: 'Cliente', enrolled_count: 3, quote_code: 'COT-1', budget_code: 'ORC-1',
  budget_id: 1, client_rut: '11.111.111-1', client_photo_url: null,
}

function montar(archived: boolean) {
  return render(
    <TurmaRowActions
      turma={turma}
      archived={archived}
      busy={false}
      onView={() => {}}
      onArchive={() => {}}
      onRestore={() => {}}
    />,
  )
}

describe('TurmaRowActions', () => {
  it('arquivar pede operation.turma.delete e restaurar pede operation.turma.restore', () => {
    comPermissoes(['operation.turma.delete'])

    montar(false)
    expect(screen.getByLabelText('archive.archiveAction')).toBeTruthy()

    cleanup()
    montar(true)
    // Só `delete` na sessão: o restore tem guard PRÓPRIO aqui.
    expect(screen.queryByText('archive.restoreAction')).toBeNull()

    cleanup()
    comPermissoes(['operation.turma.restore'])
    montar(true)
    expect(screen.getByText('archive.restoreAction')).toBeTruthy()
  })

  it('sem operation.turma.delete a caixa some, mas o olho fica', () => {
    comPermissoes(['operation.turma.view'])

    montar(false)

    expect(screen.queryByLabelText('archive.archiveAction')).toBeNull()
    expect(screen.getByLabelText('common.view')).toBeTruthy()
  })

  it('em arquivados o olho SAI: o show nao enxerga soft-deletada', () => {
    comPermissoes(['operation.turma.restore'])

    montar(true)

    expect(screen.queryByLabelText('common.view')).toBeNull()
  })
})
