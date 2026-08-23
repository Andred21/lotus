import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { EnrollmentData, TurmaData } from '@shared/types/generated'
import type { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import type { useEnrollmentsArchived } from '../../hooks/useEnrollmentsArchived'
import { EnrollmentSection } from './EnrollmentSection'

/**
 * O caminho da D5 — o switch LOCAL da aba Alumnos — não tinha teste nenhum:
 * `TurmaDetailPage.test.tsx` mocka o detalhe e nunca chega a montar esta
 * seção. O irmão já mergeado (`QuotesList.test.tsx`) tem o seu.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// Os dois diálogos abrem query própria e não têm parte nesta prova.
vi.mock('./EnrollStudentForm', () => ({ EnrollStudentForm: () => null }))
vi.mock('./ImportDialog', () => ({ ImportDialog: () => null }))

type Section = ReturnType<typeof useEnrollmentSection>
type Archived = ReturnType<typeof useEnrollmentsArchived>

const section = vi.hoisted<{ current: Partial<Section> }>(() => ({ current: {} }))
const archived = vi.hoisted<{ current: Partial<Archived> }>(() => ({ current: {} }))

vi.mock('../../hooks/useEnrollmentSection', () => ({
  useEnrollmentSection: () => section.current as Section,
}))
vi.mock('../../hooks/useEnrollmentsArchived', () => ({
  useEnrollmentsArchived: () => archived.current as Archived,
}))

const TURMA = { id: 1, client_name: 'Transelec' } as TurmaData
/** Mesma turma, registro acadêmico fechado (RN-15). */
const TURMA_CONCLUIDA = { ...TURMA, status: 'concluida' } as TurmaData

const ALUNO = {
  id: 10, turma_id: 1, student_id: 5, name: 'Ana Rojas', rut: '11.111.111-1',
  email: null, phone: null, approval_status: 'pendiente', attendance_pct: null, grades: null, photo_url: null,
} as EnrollmentData

/** O RBAC real vem da sessão (`usePermissions` lê o store) — mockar o hook
 * testaria o mock, não a fiação. Sem `operation.enrollment.manage` o botão de
 * resultado nem nasce, e a prova de que a conclusão o esconde ficaria vazia por
 * outro motivo. */
function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

/** A `EnrollmentTable` monta o `RegisterResultDialog`, que abre mutation
 * própria — o provider entra para a árvore montar, não porque a prova dependa
 * de rede. */
function montar(turma: TurmaData = TURMA) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <EnrollmentSection turma={turma} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  section.current = {
    enrollments: [], loading: false, remove: () => {}, removing: false,
    resetRemove: () => {}, reload: () => Promise.resolve(), error: undefined, loadError: null,
  }
  archived.current = {
    mode: 'active', setMode: () => {}, items: [], loading: false,
    error: undefined, refetch: () => Promise.resolve(), restore: () => {}, restoring: false,
  }
})

afterEach(() => {
  cleanup()
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

describe('EnrollmentSection e o switch local da D5', () => {
  it('o switch aparece mesmo sem matrícula ativa', () => {
    montar()

    expect(screen.getByRole('button', { name: /archive\.archived/i })).toBeTruthy()
  })

  it('em arquivados, o erro de uma REMOÇÃO que falhou não fica pendurado', () => {
    // O `resetRemove` mora no diálogo do `EnrollmentTable`, que na visão de
    // arquivadas nem está montado: sem a guarda, o banner não teria como sair.
    section.current = { ...section.current, error: 'No se pudo quitar al alumno' }
    archived.current = { ...archived.current, mode: 'archived' }

    montar()

    expect(screen.queryByText('No se pudo quitar al alumno')).toBeNull()
  })

  it('na visão ativa, o MESMO erro aparece', () => {
    section.current = { ...section.current, error: 'No se pudo quitar al alumno' }

    montar()

    expect(screen.getByText('No se pudo quitar al alumno')).toBeTruthy()
  })
})

describe('EnrollmentSection numa turma concluída (UI-01)', () => {
  beforeEach(() => {
    comPermissoes(['operation.enrollment.manage'])
    section.current = { ...section.current, enrollments: [ALUNO] }
  })

  it('em curso, os quatro controles de escrita estão lá — é o que a turma concluída precisa esconder', () => {
    montar()

    expect(screen.getByRole('button', { name: /operation\.enrollment\.importSheet/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /operation\.enrollment\.addStudent/i })).toBeTruthy()
    expect(screen.getByLabelText('certificate.result.action')).toBeTruthy()
    expect(screen.getByLabelText('operation.enrollment.remove')).toBeTruthy()
  })

  it('concluída, os dois da toolbar e os dois de cada linha somem', () => {
    montar(TURMA_CONCLUIDA)

    expect(screen.queryByRole('button', { name: /operation\.enrollment\.importSheet/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /operation\.enrollment\.addStudent/i })).toBeNull()
    expect(screen.queryByLabelText('certificate.result.action')).toBeNull()
    expect(screen.queryByLabelText('operation.enrollment.remove')).toBeNull()
  })

  it('concluída, a lista de alunos continua legível — o que sai é a escrita, não a leitura', () => {
    montar(TURMA_CONCLUIDA)

    expect(screen.getByText('Ana Rojas')).toBeTruthy()
    expect(screen.getByText('11.111.111-1')).toBeTruthy()
    expect(screen.getByRole('button', { name: /archive\.archived/i })).toBeTruthy()
  })
})
