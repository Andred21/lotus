import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import type { StudentDetailData } from '@shared/types/generated'
import { StudentDetailSections } from './StudentDetailSections'

/** `t` devolve a chave: o que se prova é QUAL ramo a tela mostra, não o texto
 * traduzido (isso é do `parity.test.ts`). Molde: `RedatorCourseSelector.test.tsx`. */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

const DETALHE = {
  id: 1,
  name: 'Pedro Rojas',
  links: [
    { id: 9, client_id: 3, client_name: 'Minera Andes', started_on: '2026-01-15', ended_on: null },
  ],
  turmas: [
    {
      turma_id: 4,
      quote_code: 'COT-2026-004',
      course_name: 'Alta tensión',
      start_date: '2026-03-01',
      approval_status: 'aprobado',
    },
  ],
} as unknown as StudentDetailData

function detail(over: Partial<UseQueryResult<StudentDetailData, ProblemDetails>>) {
  return {
    data: DETALHE,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch: () => Promise.resolve(),
    ...over,
  } as unknown as UseQueryResult<StudentDetailData, ProblemDetails>
}

afterEach(() => {
  cleanup()
})

describe('StudentDetailSections — falha COM cache não apaga as seções', () => {
  it('falha SEM cache: o erro substitui as DUAS seções', () => {
    render(
      <StudentDetailSections
        detail={detail({ data: undefined, isSuccess: false, isError: true })}
      />,
    )

    // Uma seção com cabeçalho e nada abaixo faria a falha de rede se parecer
    // com "este aluno não tem turma" — vazio silencioso proibido (D16).
    expect(screen.getByText('common.loadError')).toBeTruthy()
    expect(screen.queryByText('student.sectionLinks')).toBeNull()
    expect(screen.queryByText('student.sectionTurmas')).toBeNull()
  })

  it('falha COM cache: vínculos e turmas PERMANECEM e o aviso vai ao lado', () => {
    // O caso que forçar `data: undefined` no teste de falha esconderia — foi
    // assim que a regressão do BD-6 passou verde.
    render(
      <StudentDetailSections
        detail={detail({
          isError: true,
          // `localDetail: true` porque `screenDetail` cala o detalhe do
          // servidor, que não é localizado — sem a marca, quem imprime é o
          // `?? t(errorHint)`.
          error: { detail: 'Sin conexión', localDetail: true } as ProblemDetails,
        })}
      />,
    )

    expect(screen.getByText('Minera Andes')).toBeTruthy()
    expect(screen.getByText('Alta tensión')).toBeTruthy()
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })

  it('sucesso: nenhum aviso de falha na tela', () => {
    render(<StudentDetailSections detail={detail({})} />)

    expect(screen.getByText('Minera Andes')).toBeTruthy()
    expect(screen.queryByText('common.retry')).toBeNull()
  })
})
