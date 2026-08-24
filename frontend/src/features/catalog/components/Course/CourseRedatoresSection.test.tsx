import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { RedatorData } from '@shared/types/generated'
import type { useCourseRedatores } from '../../hooks/useCourseRedatores'
import { CourseRedatoresSection } from './CourseRedatoresSection'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Redatores = ReturnType<typeof useCourseRedatores>

const REDATOR = { id: 7, name: 'Ana Silva' } as RedatorData

const base = {
  data: [REDATOR],
  allRedatores: [REDATOR],
  enabledRedatores: [REDATOR],
  isLoading: false,
  isError: false,
  errorDetail: undefined,
  errorHint: 'common.loadErrorHint',
  loadError: null,
  refetch: () => Promise.resolve(),
  isEmpty: false,
  unusable: false,
  failedWithoutData: false,
  canOpenRedator: false,
  openRedator: () => {},
} as unknown as Redatores

const renderSection = (over: Partial<Redatores>, isCreate = false) =>
  render(
    <CourseRedatoresSection
      redatores={{ ...base, ...over } as Redatores}
      isCreate={isCreate}
      enabledIds={[7]}
      onToggle={() => {}}
    />,
  )

afterEach(() => {
  cleanup()
})

describe('CourseRedatoresSection — falha COM cache não apaga a lista', () => {
  it('falha SEM cache: o erro substitui a seção', () => {
    renderSection({
      isError: true, failedWithoutData: true, unusable: true, errorDetail: 'Sin conexión',
      data: [], allRedatores: [], enabledRedatores: [],
    })

    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(screen.queryByText('Ana Silva')).toBeNull()
  })

  it('falha COM cache no modo leitura: a lista PERMANECE e o aviso vai ao lado', () => {
    renderSection({ isError: true, failedWithoutData: false, errorDetail: 'Sin conexión' })

    expect(screen.getByText('Ana Silva')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })

  it('falha COM cache no modo cadastro: idem — os dois ramos finais avisam', () => {
    renderSection({ isError: true, failedWithoutData: false, errorDetail: 'Sin conexión' }, true)

    expect(screen.getByText('Ana Silva')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
  })
})
