import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { TurmaData } from '@shared/types/generated'
import { useTurmaDocsSection } from './useTurmaDocsSection'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

vi.mock('@shared/api/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const SUBMIT = 'operation.turma.submit_docs'
const CONCLUIDA = 'operation.turma.manage_concluded_docs'

const turma = (status: TurmaData['status']) => ({ id: 1, status }) as TurmaData

/** O RBAC real vem da sessão (`usePermissions` lê o store) — mockar o hook testaria o
 * mock, não a fiação. */
function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

function canSubmit(t: TurmaData): boolean {
  const { wrapper } = createWrapper()
  return renderHook(() => useTurmaDocsSection(t), { wrapper }).result.current.canSubmit
}

describe('useTurmaDocsSection — quem pode subir e remover documento', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
  })

  it('turma concluída sem a permissão de turma concluída: não pode, mesmo com submit_docs', () => {
    comPermissoes([SUBMIT])

    expect(canSubmit(turma('concluida'))).toBe(false)
  })

  it('turma concluída com submit_docs e a permissão de turma concluída: pode', () => {
    comPermissoes([SUBMIT, CONCLUIDA])

    expect(canSubmit(turma('concluida'))).toBe(true)
  })

  it('turma concluída só com a permissão de turma concluída, sem submit_docs: não pode', () => {
    comPermissoes([CONCLUIDA])

    expect(canSubmit(turma('concluida'))).toBe(false)
  })

  it('turma em andamento com submit_docs: pode, sem exigir a permissão de turma concluída', () => {
    comPermissoes([SUBMIT])

    expect(canSubmit(turma('em_andamento'))).toBe(true)
  })

  it('turma em andamento sem submit_docs: não pode', () => {
    comPermissoes([])

    expect(canSubmit(turma('em_andamento'))).toBe(false)
  })
})
