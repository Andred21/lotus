import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { TurmaData, TurmaDocumentType } from '@shared/types/generated'
import { useTurmaDocsSection } from './useTurmaDocsSection'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

vi.mock('@shared/api/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const SUBMIT = 'operation.turma.submit_docs'
const CONCLUIDA = 'operation.turma.manage_concluded_docs'
const CLIENTE = 'operation.turma.submit_client_evaluation'

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

function secao(t: TurmaData) {
  const { wrapper } = createWrapper()
  return renderHook(() => useTurmaDocsSection(t), { wrapper }).result.current
}

describe('useTurmaDocsSection — quem pode subir e remover cada tipo', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
  })

  it('admin com submit_client_evaluation: anexa e remove Cliente, não os demais', () => {
    comPermissoes([CLIENTE])
    const s = secao(turma('em_andamento'))

    expect(s.canUpload('EVALUACION_CLIENTE')).toBe(true)
    expect(s.canRemove('EVALUACION_CLIENTE')).toBe(true)
    expect(s.canUpload('MANUAL')).toBe(false)
    expect(s.canUpload('EVALUACION_ALUNO')).toBe(false)
    expect(s.canRemove('EVALUACION_ALUNO')).toBe(false)
  })

  it('redator em turma concluída: só Alumnos, e nada se remove', () => {
    comPermissoes([SUBMIT])
    const s = secao(turma('concluida'))

    expect(s.canUpload('EVALUACION_ALUNO')).toBe(true)
    expect(s.canUpload('MANUAL')).toBe(false)
    expect(s.canUpload('EVALUACION_CLIENTE')).toBe(false)
    expect(s.canRemove('EVALUACION_ALUNO')).toBe(false)
  })

  it('turma concluída com a permissão de turma concluída: anexa e remove o Manual, mesmo sem submit_docs', () => {
    comPermissoes([CONCLUIDA])
    const s = secao(turma('concluida'))

    expect(s.canUpload('MANUAL')).toBe(true)
    expect(s.canRemove('MANUAL')).toBe(true)
  })

  it('turma em andamento com submit_docs: o redator anexa e remove o Manual', () => {
    comPermissoes([SUBMIT])
    const s = secao(turma('em_andamento'))

    expect(s.canUpload('MANUAL')).toBe(true)
    expect(s.canRemove('MANUAL')).toBe(true)
  })

  it('sem permissão nenhuma: nada, e o motivo é a permissão', () => {
    comPermissoes([])
    const s = secao(turma('em_andamento'))

    expect(s.canUpload('MANUAL')).toBe(false)
    expect(s.lockReason).toBe('permission')
  })

  it('o admin só com Cliente não vê o aviso de falta de permissão', () => {
    comPermissoes([CLIENTE])

    expect(secao(turma('em_andamento')).lockReason).toBeNull()
  })
})

describe('useTurmaDocsSection — progresso conta só os bloqueantes', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    comPermissoes([SUBMIT])
  })

  const comFaltas = (missing: TurmaDocumentType[], optional: TurmaDocumentType[] = []) =>
    ({ id: 1, status: 'em_andamento', missing_document_types: missing, missing_optional_document_types: optional }) as TurmaData

  it('turma habilitada: 2 de 2, mesmo com as opcionais faltando', () => {
    const s = secao(comFaltas([], ['EVALUACION_CLIENTE', 'EVALUACION_ALUNO']))

    expect(s.totalTypes).toBe(2)
    expect(s.deliveredCount).toBe(2)
  })

  it('falta o Manual: 1 de 2', () => {
    const s = secao(comFaltas(['MANUAL']))

    expect(s.totalTypes).toBe(2)
    expect(s.deliveredCount).toBe(1)
  })

  it('o backend repassa as opcionais que faltam para o cartão', () => {
    expect(secao(comFaltas([], ['EVALUACION_CLIENTE'])).missingOptional).toEqual(['EVALUACION_CLIENTE'])
  })
})
