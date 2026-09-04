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

    // Turma 4 tem um tipo só (`MANUAL`); turma 7 tem dois (`PRUEBAS`,
    // `EVALUACION_REDATOR`) — o par prova o separador ", " entre RÓTULOS
    // resolvidos, não entre códigos crus.
    expect(linhas[0].textContent).toBe('dashboard.redator.pendencias.missing:operation.documents.type.MANUAL')
    expect(linhas[1].textContent).toBe(
      'dashboard.redator.pendencias.missing:operation.documents.type.PRUEBAS, operation.documents.type.EVALUACION_REDATOR',
    )

    // O bug (UI-02) era `item.missing_types.join(', ')` direto: com o `t` mockado
    // acima, isso apareceria como "...missing:MANUAL" e "...missing:PRUEBAS,
    // EVALUACION_REDATOR" — o código cru do enum, sem passar por t() por item.
    expect(screen.queryByText('dashboard.redator.pendencias.missing:MANUAL')).toBeNull()
    expect(screen.queryByText('dashboard.redator.pendencias.missing:PRUEBAS, EVALUACION_REDATOR')).toBeNull()
  })
})
