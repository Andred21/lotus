import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CourseData } from '@shared/types/generated'
import type { useQuoteCourseSearch } from '../../hooks/useQuoteCourseSearch'
import { CourseStep } from './CourseStep'

/** `t` devolve a chave: o que se prova aqui é QUAL estado o passo mostra, não o
 * texto traduzido (isso é do `parity.test.ts`). */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Courses = ReturnType<typeof useQuoteCourseSearch>

const CURSO = { id: 1, name: 'Alta tensión', workload_hours: 8 } as CourseData

/** Estado feliz; cada teste sobrescreve só o que o SEU ramo muda. */
const base: Courses = {
  data: [CURSO],
  list: [CURSO],
  search: '',
  setSearch: () => {},
  isLoading: false,
  isError: false,
  errorDetail: undefined,
  errorHint: 'common.loadErrorHint',
  loadError: null,
  refetch: () => Promise.resolve(),
  isEmpty: false,
  unusable: false,
  failedWithoutData: false,
  noResults: false,
}

const renderStep = (courses: Partial<Courses>) =>
  render(<CourseStep courses={{ ...base, ...courses }} selectedId={0} onSelect={() => {}} />)

describe('CourseStep — os cinco estados', () => {
  it('carregando: esqueleto com aria-busy e SEM campo de busca', () => {
    const { container } = renderStep({ isLoading: true, list: [] })

    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
    // Filtrar coisa nenhuma é controle morto.
    expect(screen.queryByPlaceholderText('quote.courseSearchPlaceholder')).toBeNull()
  })

  it('falha SEM cache: erro no passo inteiro, e NUNCA a mensagem de catálogo vazio', () => {
    renderStep({
      isError: true, failedWithoutData: true, unusable: true, errorDetail: 'Sin conexión',
      data: [], list: [],
    })

    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    expect(screen.getByText('common.retry')).toBeTruthy()
    // É o B-7 inteiro: 403 não pode virar "no hay cursos".
    expect(screen.queryByText('course.empty')).toBeNull()
  })

  it('falha COM cache: a lista fica, o aviso vai ao lado dela', () => {
    // O ramo que a suíte não cobria e que deixou a regressão passar verde: o
    // teste acima força `list: []`, então `isError` cru parecia correto (Q-1).
    renderStep({ isError: true, errorDetail: 'Sin conexión' })

    expect(screen.getByText('Alta tensión')).toBeTruthy()
    expect(screen.getByPlaceholderText('quote.courseSearchPlaceholder')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    // Substituir o passo é do ramo sem cache; aqui o `AppErrorState` não entra.
    expect(screen.queryByText('common.loadError')).toBeNull()
  })

  it('catálogo vazio de verdade: mensagem própria, sem alarme de falha', () => {
    renderStep({ isEmpty: true, list: [] })

    expect(screen.getByText('course.empty')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })

  it('termo sem resultado: a busca continua na tela, a lista some', () => {
    renderStep({ noResults: true, search: 'zzz', list: [] })

    expect(screen.getByPlaceholderText('quote.courseSearchPlaceholder')).toBeTruthy()
    expect(screen.getByText('common.noResults')).toBeTruthy()
    expect(screen.queryByText('Alta tensión')).toBeNull()
  })

  it('lista: busca e curso na tela', () => {
    renderStep({})

    expect(screen.getByPlaceholderText('quote.courseSearchPlaceholder')).toBeTruthy()
    expect(screen.getByText('Alta tensión')).toBeTruthy()
  })
})
