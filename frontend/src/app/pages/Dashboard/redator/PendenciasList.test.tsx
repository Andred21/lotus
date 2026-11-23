import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { RedatorTurmaPendenciaData } from '@shared/types/generated'
import { PendenciasList } from './PendenciasList'

// O `t` devolve a chave, mas ECOA a interpolação de `types` (mesma convenção do
// UI-01 em `ProfileDocumentSlot.test.tsx`): sem isso a UI-02 não teria como
// provar que `types` chegou como RÓTULOS resolvidos por item, e não como o
// array cru costurado por `join()`.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts?.types === undefined ? key : `${key}:${String(opts.types)}`),
    }),
  }
})

// Dois `turma_id` diferentes: um teste que passasse com um `to` fixo não
// provaria nada — a UI-01 era exatamente uma ação com destino único (`/perfil`)
// para N turmas.
const items: RedatorTurmaPendenciaData[] = [
  { turma_id: 4, course_name: 'Alta tensión — Módulo 1', end_date: '2026-09-01', missing_types: ['MANUAL'], missing_optional_types: [] },
  { turma_id: 7, course_name: 'Baja tensión — Módulo 2', end_date: '2026-09-10', missing_types: ['MANUAL', 'EVALUACION_REDATOR'], missing_optional_types: [] },
]

const itemsComAviso: RedatorTurmaPendenciaData[] = [
  { turma_id: 4, course_name: 'Alta tensión — Módulo 1', end_date: '2026-09-01', missing_types: ['MANUAL'], missing_optional_types: ['EVALUACION_ALUNO'] },
  { turma_id: 9, course_name: 'Media tensión — Módulo 3', end_date: '2026-09-12', missing_types: [], missing_optional_types: ['EVALUACION_ALUNO'] },
]

const montarComAviso = () =>
  render(
    <MemoryRouter>
      <PendenciasList items={itemsComAviso} />
    </MemoryRouter>,
  )

const montar = () =>
  render(
    <MemoryRouter>
      <PendenciasList items={items} />
    </MemoryRouter>,
  )

describe('PendenciasList — a pendência leva à turma, não ao perfil', () => {
  it('cada linha da lista é um link para a turma correspondente', () => {
    montar()

    // Com `?tab=docs`: o link leva à ABA que resolve a pendência, não só à
    // turma — a página abria em Configuración (Q-1 do review de 2026-08-24).
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/operacion/turmas/4?tab=docs',
      '/operacion/turmas/7?tab=docs',
    ])
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

describe('PendenciasList — a lista "Falta:" traduz o tipo de documento, não o código do enum (UI-02)', () => {
  it('cada tipo passa por t(), e dois tipos provam também o separador ", "', () => {
    montar()

    const linhas = screen.getAllByText(/^dashboard\.redator\.pendencias\.missing:/)
    expect(linhas).toHaveLength(2)

    // Turma 4 tem um tipo só (`MANUAL`); turma 7 tem dois (`MANUAL`,
    // `EVALUACION_REDATOR`) — o par prova o separador ", " entre RÓTULOS
    // resolvidos, não entre códigos crus.
    expect(linhas[0].textContent).toBe('dashboard.redator.pendencias.missing:operation.documents.type.MANUAL')
    expect(linhas[1].textContent).toBe(
      'dashboard.redator.pendencias.missing:operation.documents.type.MANUAL, operation.documents.type.EVALUACION_REDATOR',
    )

    // O bug (UI-02) era `item.missing_types.join(', ')` direto: com o `t` mockado
    // acima, isso apareceria como "...missing:MANUAL" e "...missing:MANUAL,
    // EVALUACION_REDATOR" — o código cru do enum, sem passar por t() por item.
    expect(screen.queryByText('dashboard.redator.pendencias.missing:MANUAL')).toBeNull()
    expect(screen.queryByText('dashboard.redator.pendencias.missing:MANUAL, EVALUACION_REDATOR')).toBeNull()
  })
})

describe('PendenciasList — aviso das evaluaciones opcionais (bloco 60)', () => {
  it('o aviso de Alumnos vem abaixo dos bloqueantes, em tom diferente', () => {
    montarComAviso()

    const bloqueante = screen.getByText('dashboard.redator.pendencias.missing:operation.documents.type.MANUAL')
    const [avisoDaTurma4] = screen.getAllByText('dashboard.redator.pendencias.warning:operation.documents.type.EVALUACION_ALUNO')

    expect(bloqueante.compareDocumentPosition(avisoDaTurma4) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(avisoDaTurma4.style.color).not.toBe('')
    expect(avisoDaTurma4.style.color).not.toBe(bloqueante.style.color)
  })

  it('a turma só com aviso aparece sem item bloqueante, e não entra na contagem', () => {
    montarComAviso()

    const linhas = screen.getAllByRole('listitem')
    expect(linhas).toHaveLength(2)

    // Turma 9: aviso, e nenhuma linha "Falta:" (nem o rótulo com lista vazia).
    expect(linhas[1].textContent).toContain('dashboard.redator.pendencias.warning:')
    expect(linhas[1].textContent).not.toContain('dashboard.redator.pendencias.missing')

    // Só a turma 4 é pendência: o aviso não conta.
    const titulo = screen.getByText('dashboard.redator.pendencias.title')
    expect(titulo.parentElement?.textContent).toContain('1')
    expect(titulo.parentElement?.textContent).not.toContain('2')
  })
})
