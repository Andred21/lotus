import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { RedatorTurmaPendenciaData } from '@shared/types/generated'
import { PendenciasList } from './PendenciasList'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

afterEach(() => cleanup())

// Dois `turma_id` diferentes: um teste que passasse com um `to` fixo não
// provaria nada — a UI-01 era exatamente uma ação com destino único (`/perfil`)
// para N turmas.
const items: RedatorTurmaPendenciaData[] = [
  { turma_id: 4, course_name: 'Alta tensión — Módulo 1', end_date: '2026-09-01', missing_types: ['MANUAL'] },
  { turma_id: 7, course_name: 'Baja tensión — Módulo 2', end_date: '2026-09-10', missing_types: ['PRUEBAS', 'EVALUACION_REDATOR'] },
]

const montar = () =>
  render(
    <MemoryRouter>
      <PendenciasList items={items} />
    </MemoryRouter>,
  )

describe('PendenciasList — a pendência leva à turma, não ao perfil', () => {
  it('cada linha da lista é um link para a turma correspondente', () => {
    montar()

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/operacion/turmas/4', '/operacion/turmas/7'])
  })

  it('nenhum controle do card aponta para /perfil', () => {
    montar()

    // A UI-01 era um `AppButton` (role="button", `onClick` para `navigate('/perfil')`)
    // no cabeçalho. Sem cabeçalho de ação, não deve sobrar nenhum `button` no card.
    expect(screen.queryByRole('button')).toBeNull()

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(hrefs).not.toContain('/perfil')
  })
})
