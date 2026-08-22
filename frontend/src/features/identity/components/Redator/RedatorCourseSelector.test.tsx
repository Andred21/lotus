import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CourseData } from '@shared/types/generated'
import type { useRedatorCourses } from '../../hooks/useRedatorCourses'
import { RedatorCourseSelector } from './RedatorCourseSelector'

/** `t` devolve a chave: o que se prova é QUAL ramo a tela mostra, não o texto
 * traduzido (isso é do `parity.test.ts`). Molde: `CourseStep.test.tsx`. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Courses = ReturnType<typeof useRedatorCourses>

const CURSO = { id: 1, name: 'Alta tensión', workload_hours: 8 } as CourseData

const base = {
  data: [CURSO],
  enabledCourses: [CURSO],
  orderedCourses: [CURSO],
  isLoading: false,
  isError: false,
  errorDetail: undefined,
  errorHint: 'common.loadErrorHint',
  loadError: null,
  refetch: () => Promise.resolve(),
  isEmpty: false,
  unusable: false,
  failedWithoutData: false,
} as unknown as Courses

let atual: Courses = base
vi.mock('../../hooks/useRedatorCourses', () => ({
  useRedatorCourses: () => atual,
}))

const renderSelector = (over: Partial<Courses>, readOnly = false) => {
  atual = { ...base, ...over } as Courses
  return render(
    <RedatorCourseSelector courseIds={[1]} readOnly={readOnly} onToggle={() => {}} orderKey="1:edit" />,
  )
}

afterEach(() => {
  cleanup()
  atual = base
})

describe('RedatorCourseSelector — falha COM cache não apaga a lista', () => {
  it('falha SEM cache: o erro substitui a seção', () => {
    renderSelector({
      isError: true, failedWithoutData: true, unusable: true, errorDetail: 'Sin conexión',
      data: [], enabledCourses: [], orderedCourses: [],
    })

    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(screen.queryByText('Alta tensión')).toBeNull()
  })

  it('falha COM cache: a lista PERMANECE e o aviso vai ao lado', () => {
    // O caso que forçar `orderedCourses: []` no teste esconderia — foi assim que
    // a regressão do BD-6 passou verde.
    renderSelector({ isError: true, failedWithoutData: false, errorDetail: 'Sin conexión' })

    expect(screen.getByText('Alta tensión')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })

  it('falha COM cache no ramo readOnly: idem — a lista é a mesma nos dois ramos', () => {
    renderSelector({ isError: true, failedWithoutData: false, errorDetail: 'Sin conexión' }, true)

    expect(screen.getByText('Alta tensión')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
  })
})
