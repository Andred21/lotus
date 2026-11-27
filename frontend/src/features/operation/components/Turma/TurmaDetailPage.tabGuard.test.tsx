import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { TurmaData } from '@shared/types/generated'
import type { useTurmaDetail } from '../../hooks/useTurmaDetail'
import { TurmaDetailPage } from './TurmaDetailPage'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// As outras abas não têm parte nesta prova; o cartão de configuração é o REAL
// (a guarda vive no form dele).
vi.mock('./RedatorDesignation', () => ({ RedatorDesignation: () => null }))
vi.mock('../Enrollment/EnrollmentSection', () => ({ EnrollmentSection: () => null }))
vi.mock('../Document/TurmaDocuments', () => ({ TurmaDocuments: () => null }))
vi.mock('../Document/ConcludePanel', () => ({ ConcludePanel: () => null }))
vi.mock('../../api/useTurmas', () => ({
  useCreateTurma: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUpdateTurma: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@shared/api/coursesApi', () => ({ coursesApi: { useList: () => ({ data: [] }) } }))

type TurmaDetail = ReturnType<typeof useTurmaDetail>
const setTab = vi.hoisted(() => vi.fn())
const TURMA = {
  id: 3, quote_id: 1, course_id: 9, modalidade: 'presencial', local_aplicacao: 'Santiago',
  start_date: '2026-01-05', end_date: '2026-02-05', status: 'em_andamento', habilitada: false,
  missing_document_types: [], missing_optional_document_types: [], missing_requirements: [], concluded_at: null,
  redatores: [], course_name: 'Alta Tensión', client_name: 'Transelec', enrolled_count: 15, quote_code: 'COT-1',
  budget_code: 'ORC-1', budget_id: null, approval_rule: { min_grade: 4, min_attendance_pct: 70 },
  client_rut: '11.111.111-1', client_photo_url: null,
} as TurmaData
vi.mock('../../hooks/useTurmaDetail', () => ({
  useTurmaDetail: () => ({ goBack: () => {}, reload: () => Promise.resolve(), tab: 0, setTab, turma: TURMA }) as unknown as TurmaDetail,
}))

function montar() {
  const router = createMemoryRouter([{ path: '/', element: <TurmaDetailPage /> }])
  render(<RouterProvider router={router} />)
}

const perguntou = () => screen.queryByText('common.discardTitle') !== null
const editar = () => fireEvent.click(screen.getByRole('button', { name: /common\.edit/ }))
const sujar = () => fireEvent.change(screen.getByLabelText('operation.config.local'), { target: { value: 'Valparaíso' } })
const irParaAlumnos = () => fireEvent.click(screen.getByRole('tab', { name: /operation\.detail\.tabs\.students/ }))

beforeAll(registerPrimeLocales)
beforeEach(() => {
  setTab.mockReset()
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Admin', email: 'a@lotus.cl', type: 'admin', is_active: true,
      roles: [], permissions: ['operation.turma.update', 'operation.turma.view'], photo_url: null,
    },
  })
})
afterEach(() => useSessionStore.setState({ user: null, status: 'unauthenticated' }))

/**
 * O `TabView` só mantém montado o painel ativo: trocar de aba desmonta o
 * cartão de configuração e o rascunho some. Só a query muda, então o blocker do
 * router (que olha o pathname) não pergunta — a página pergunta pela mesma
 * guarda do cartão.
 */
describe('TurmaDetailPage — trocar de aba com a configuração suja', () => {
  it('pergunta antes de trocar e não troca enquanto não responde', async () => {
    montar()
    editar()
    sujar()

    irParaAlumnos()

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(setTab).not.toHaveBeenCalled()
  })

  it('Descartar troca a aba', async () => {
    montar()
    editar()
    sujar()
    irParaAlumnos()
    await waitFor(() => expect(perguntou()).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: /common\.discardConfirm/ }))

    await waitFor(() => expect(setTab).toHaveBeenCalledWith(1))
  })

  it('Seguir editando fica na aba, com o rascunho', async () => {
    montar()
    editar()
    sujar()
    irParaAlumnos()
    await waitFor(() => expect(perguntou()).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: /common\.keepEditing/ }))

    await waitFor(() => expect(perguntou()).toBe(false))
    expect(setTab).not.toHaveBeenCalled()
    expect((screen.getByLabelText('operation.config.local') as HTMLInputElement).value).toBe('Valparaíso')
  })

  it('sem rascunho troca direto', () => {
    montar()
    editar()

    irParaAlumnos()

    expect(perguntou()).toBe(false)
    expect(setTab).toHaveBeenCalledWith(1)
  })
})
