import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { TurmaData } from '@shared/types/generated'
import type { useTurmaConfigForm } from '../../hooks/useTurmaConfigForm'
import { TurmaConfigCard } from './TurmaConfigCard'

/**
 * Catraca do UI-01: numa turma concluída o registro acadêmico inteiro está
 * trancado (RN-15) e `UpdateTurmaAction` recusa a escrita com 422 — o `Editar`
 * abria um formulário para uma gravação que a API sempre nega. A decisão é do
 * COMPONENTE, não do call-site (`TurmaDetailPage`), para que um consumidor
 * futuro nasça correto: é aqui que a prova mora.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type ConfigForm = ReturnType<typeof useTurmaConfigForm>

/** O form abre `coursesApi.useList()` para a carga horária; ele não tem parte
 * nesta prova, que é sobre QUAL controle a tela monta. */
const form = vi.hoisted<{ current: Partial<ConfigForm> }>(() => ({ current: {} }))
vi.mock('../../hooks/useTurmaConfigForm', () => ({
  useTurmaConfigForm: () => form.current as ConfigForm,
}))

const TURMA = {
  id: 1, quote_id: 1, course_id: 9, modalidade: 'presencial', local_aplicacao: 'Santiago',
  start_date: '2026-01-05', end_date: '2026-02-05', status: 'em_andamento', habilitada: false,
  missing_document_types: [], concluded_at: null, redatores: [], course_name: 'Alta Tensión',
  client_name: 'Transelec', enrolled_count: 15, quote_code: 'COT-1', budget_code: 'ORC-1',
  budget_id: 1, client_rut: '11.111.111-1', client_photo_url: null,
} as TurmaData
/** Mesma turma, registro acadêmico fechado (RN-15). */
const TURMA_CONCLUIDA = { ...TURMA, status: 'concluida' } as TurmaData

/** O RBAC real vem da sessão (`usePermissions` lê o store) — mockar o hook
 * testaria o mock, não a fiação. Molde do `EnrollmentSection.test.tsx`. */
function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

beforeEach(() => {
  comPermissoes(['operation.turma.update'])
  form.current = {
    form: {
      modalidade: 'presencial', local_aplicacao: 'Santiago',
      start_date: '2026-01-05', end_date: '2026-02-05',
    },
    set: () => {},
    readOnly: true,
    submit: () => {},
    pending: false,
    fieldErrors: undefined,
    generalError: undefined,
    workloadHours: 40,
  }
})

afterEach(() => {
  cleanup()
})

describe('TurmaConfigCard numa turma concluída (UI-01)', () => {
  it('em curso, o Editar está lá — é o que a turma concluída precisa esconder', () => {
    render(<TurmaConfigCard mode="view" turma={TURMA} onEdit={() => {}} onSaved={() => {}} />)

    expect(screen.getByRole('button', { name: /common\.edit/i })).toBeTruthy()
  })

  it('concluída, o Editar some', () => {
    render(<TurmaConfigCard mode="view" turma={TURMA_CONCLUIDA} onEdit={() => {}} onSaved={() => {}} />)

    expect(screen.queryByRole('button', { name: /common\.edit/i })).toBeNull()
  })

  it('concluída, os campos continuam legíveis — o que sai é a escrita, não a leitura', () => {
    render(<TurmaConfigCard mode="view" turma={TURMA_CONCLUIDA} onEdit={() => {}} onSaved={() => {}} />)

    expect(screen.getByText('operation.config.title')).toBeTruthy()
    expect(screen.getByText('operation.config.local')).toBeTruthy()
    expect(screen.getByText('Santiago')).toBeTruthy()
  })

  it('em `create` a turma é null e o cartão monta sem estourar', () => {
    render(<TurmaConfigCard mode="create" quoteId={7} onSaved={() => {}} />)

    expect(screen.getByText('operation.config.title')).toBeTruthy()
    expect(screen.getByRole('button', { name: /operation\.config\.save/i })).toBeTruthy()
  })
})

/**
 * Catraca do Q-2 (review de 2026-08-24): a RN-15 era só metade da pergunta. O
 * `update` do `TurmaController` exige `operation.turma.update`, e o cartão
 * escondia por estado e nunca por permissão — o redator, que desde este bloco
 * chega a esta página pela pendência do dashboard, via "Editar" para uma
 * gravação que a API responde com 403.
 */
describe('TurmaConfigCard sem permissão de escrita (Q-2)', () => {
  it('turma em curso, mas sem `operation.turma.update`: nada de Editar', () => {
    comPermissoes(['operation.turma.view'])

    render(<TurmaConfigCard mode="view" turma={TURMA} onEdit={() => {}} onSaved={() => {}} />)

    expect(screen.queryByRole('button', { name: /common\.edit/i })).toBeNull()
  })

  it('sem a permissão, a leitura permanece — o que sai é a escrita', () => {
    comPermissoes([])

    render(<TurmaConfigCard mode="view" turma={TURMA} onEdit={() => {}} onSaved={() => {}} />)

    expect(screen.getByText('operation.config.title')).toBeTruthy()
    expect(screen.getByText('Santiago')).toBeTruthy()
  })
})
