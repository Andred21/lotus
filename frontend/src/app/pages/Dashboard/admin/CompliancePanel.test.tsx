import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { formatIsoDate } from '@shared/lib'
import { renderWithProviders } from '@shared/testing/providers'
import type { TurmaComplianceData } from '@shared/types/generated'
import { CompliancePanel } from './CompliancePanel'

// `t` devolve a chave, que é o que os testes provam: QUAL texto a coluna escolhe.
// A exceção é o intervalo, cuja tradução real recebe os marcadores das duas datas
// em `start`/`end` — sem isso o `IntervaloDeDatas` não teria o que partir.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (key === 'dashboard.agenda.range' ? `${opts?.start} a ${opts?.end}` : key),
    }),
  }
})

const REDATOR = 'operation.conclusion.requirement.redator'
const LOCAL = 'operation.conclusion.requirement.local_aplicacao'
const MANUAL = 'operation.documents.type.MANUAL'

function linha(over: Partial<TurmaComplianceData> = {}): TurmaComplianceData {
  return {
    turma_id: 1,
    course_name: 'Operación de Subestaciones',
    redatores: [],
    start_date: '2026-08-10',
    end_date: '2026-08-18',
    present_types: [],
    missing_types: [],
    missing_requirements: [],
    habilitada: false,
    ...over,
  }
}

/** A célula da coluna "Faltan" (a quinta) da única linha de dado. */
function celulaFaltan(): HTMLElement {
  const [, corpo] = screen.getAllByRole('row')
  return within(corpo).getAllByRole('cell')[4]
}

describe('CompliancePanel — coluna "Faltan" (D6)', () => {
  it('lista os requisitos quando não falta documento algum, e não mostra o traço', () => {
    renderWithProviders(
      <CompliancePanel turmas={[linha({ missing_types: [], missing_requirements: ['redator', 'local_aplicacao'] })]} />,
      { route: '/' },
    )

    const faltan = celulaFaltan()
    expect(faltan.textContent).toContain(REDATOR)
    expect(faltan.textContent).toContain(LOCAL)
    expect(faltan.textContent).not.toContain('—')
  })

  it('põe os documentos antes dos requisitos', () => {
    renderWithProviders(
      <CompliancePanel turmas={[linha({ missing_types: ['MANUAL'], missing_requirements: ['redator'] })]} />,
      { route: '/' },
    )

    expect(celulaFaltan().textContent).toBe(`${MANUAL}, ${REDATOR}`)
  })

  it('mostra o traço só quando documentos e requisitos estão completos', () => {
    renderWithProviders(<CompliancePanel turmas={[linha({ habilitada: true })]} />, { route: '/' })

    expect(celulaFaltan().textContent).toBe('—')
  })
})

describe('CompliancePanel — intervalo de datas (D-73)', () => {
  it('põe cada data num span que não quebra, e deixa o separador solto entre eles', () => {
    renderWithProviders(
      <CompliancePanel turmas={[linha({ start_date: '2026-08-10', end_date: '2026-08-18' })]} />,
      { route: '/' },
    )

    const [, corpo] = screen.getAllByRole('row')
    const intervalo = within(corpo).getAllByRole('cell')[2]
    const datas = Array.from(intervalo.querySelectorAll('span.whitespace-nowrap'))

    // Pelo formatador e não por literal: a grafia da data é do locale do ambiente.
    expect(datas.map((d) => d.textContent)).toEqual([formatIsoDate('2026-08-10'), formatIsoDate('2026-08-18')])
    // O intervalo inteiro NÃO é nowrap: é isso que deixa a célula quebrar entre as datas.
    expect(intervalo.querySelector('span.whitespace-nowrap')?.parentElement?.classList.contains('whitespace-nowrap')).toBe(
      false,
    )
    expect(intervalo.textContent).toBe(`${formatIsoDate('2026-08-10')} a ${formatIsoDate('2026-08-18')}`)
  })

  it('com início igual ao fim, mostra as duas datas, cada uma no próprio span', () => {
    renderWithProviders(
      <CompliancePanel turmas={[linha({ start_date: '2026-08-10', end_date: '2026-08-10' })]} />,
      { route: '/' },
    )

    const [, corpo] = screen.getAllByRole('row')
    const datas = within(corpo).getAllByRole('cell')[2].querySelectorAll('span.whitespace-nowrap')

    expect(Array.from(datas).map((d) => d.textContent)).toEqual([
      formatIsoDate('2026-08-10'),
      formatIsoDate('2026-08-10'),
    ])
  })
})
