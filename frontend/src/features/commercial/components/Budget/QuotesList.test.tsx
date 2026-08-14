import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { QuoteData } from '@shared/types/generated'
import { QuotesList } from './QuotesList'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

const cursos = vi.hoisted(() => ({
  current: { isError: false, errorDetail: undefined as string | undefined },
}))

vi.mock('../../hooks/useQuotesListCourses', () => ({
  useQuotesListCourses: () => ({
    courseName: () => 'Alta tensión',
    isError: cursos.current.isError,
    errorDetail: cursos.current.errorDetail,
    refetch: () => {},
  }),
}))

vi.mock('../../hooks/useQuoteFiles', () => ({
  useQuoteFiles: () => ({
    fileError: null,
    sizeError: null,
    isUploading: () => false,
    upload: () => {},
    remove: () => {},
    setSizeError: () => {},
  }),
}))

const COTACAO = {
  id: 1, course_id: 7, status: 'pending', value_uf: '10', student_count: 2, files: [],
} as unknown as QuoteData

afterEach(() => {
  cleanup()
  cursos.current = { isError: false, errorDetail: undefined }
})

describe('QuotesList sob falha do GET de cursos', () => {
  it('avisa da falha SEM esconder as cotações', () => {
    cursos.current = { isError: true, errorDetail: 'Sin conexión' }

    render(<QuotesList quotes={[COTACAO]} />)

    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    // O ponto da D2: valor UF, status e arquivos vieram do GET do orçamento, que
    // carregou bem — esconder o registro por falha de NOME é o erro inverso.
    expect(screen.getByText('Alta tensión')).toBeTruthy()
  })

  it('sem falha não há aviso nenhum', () => {
    render(<QuotesList quotes={[COTACAO]} />)

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Alta tensión')).toBeTruthy()
  })
})
