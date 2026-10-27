import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import type { EnrollmentData, TurmaData } from '@shared/types/generated'
import { enrollmentKeys } from '../api/useEnrollments'
import { useConclusionSection } from './useConclusionSection'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

vi.mock('@shared/api/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const get = vi.mocked(api.get)

const matricula = (id: number, name: string, grades: unknown, attendance_pct: string | null): EnrollmentData => ({
  id, turma_id: 1, student_id: id, name, rut: `${id}`, email: null, phone: null,
  approval_status: 'pendiente', attendance_pct, grades: grades as EnrollmentData['grades'],
  result_locked: false, photo_url: null,
})

const turma = (over: Partial<TurmaData> = {}) => ({ id: 1, ...over }) as TurmaData

describe('useConclusionSection — alunos sem nota ou presença', () => {
  beforeEach(() => { get.mockReset() })

  it('lista as matrículas incompletas na ordem da lista, com o que falta', async () => {
    get.mockResolvedValue({
      data: [
        matricula(1, 'Ana', { final: '5' }, '80'),
        matricula(2, 'Bruno', null, '90'),
        matricula(3, 'Carla', null, null),
      ],
    })
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useConclusionSection(turma()), { wrapper })

    await waitFor(() => expect(result.current.incompleteStudents).toHaveLength(2))
    expect(result.current.incompleteStudents).toEqual([
      { name: 'Bruno', missing: ['grade'] },
      { name: 'Carla', missing: ['grade', 'attendance'] },
    ])
  })

  it('com o GET da lista falhando, não afirma nada: lista vazia', async () => {
    get.mockRejectedValue({ status: 500, title: 'x' })
    const { wrapper, client } = createWrapper()

    const { result } = renderHook(() => useConclusionSection(turma()), { wrapper })

    // Espera a consulta falhar de fato: só então "não carregou" é a situação sob teste.
    await waitFor(() => expect(client.getQueryState(enrollmentKeys.list(1))?.status).toBe('error'))
    expect(result.current.incompleteStudents).toEqual([])
  })

  it('com a lista ainda carregando, a lista de incompletos é vazia', () => {
    get.mockReturnValue(new Promise(() => {}))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useConclusionSection(turma()), { wrapper })

    expect(result.current.incompleteStudents).toEqual([])
  })

  it('repassa os requisitos faltantes da turma', () => {
    get.mockReturnValue(new Promise(() => {}))
    const { wrapper } = createWrapper()

    const { result } = renderHook(
      () => useConclusionSection(turma({ missing_requirements: ['redator', 'local_aplicacao'] })),
      { wrapper },
    )

    expect(result.current.missingRequirements).toEqual(['redator', 'local_aplicacao'])
  })

  it('sem `missing_requirements` na turma devolve lista vazia', () => {
    get.mockReturnValue(new Promise(() => {}))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useConclusionSection(turma()), { wrapper })

    expect(result.current.missingRequirements).toEqual([])
  })
})
