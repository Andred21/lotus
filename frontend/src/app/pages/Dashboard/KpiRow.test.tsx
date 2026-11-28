import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiRow, type Kpi } from './KpiRow'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const items: Kpi[] = [
  { key: 'dashboard.kpi.clasesConDocumentacionPendiente', value: '12', tone: 'neutral' },
]

/**
 * B-12 do audit de 2026-11-26: rótulo de KPI longo quebrava feio numa caixa
 * estreita ao lado do número. Abaixo de `sm` o número desce para a própria
 * linha e o rótulo ocupa a largura inteira, balanceado e com hifenização.
 */
describe('rótulo de KPI legível', () => {
  it('o rótulo balanceia as linhas e hifeniza', () => {
    render(<KpiRow items={items} />)

    const rotulo = screen.getByText('dashboard.kpi.clasesConDocumentacionPendiente')
    expect(rotulo.className).toContain('text-balance')
    expect(rotulo.className).toContain('hyphens-auto')
  })

  it('abaixo de sm o valor fica em linha própria: o corpo empilha, não vira linha', () => {
    render(<KpiRow items={items} />)

    const corpo = screen.getByText('12').closest('p')!.parentElement!
    expect(corpo.className).toMatch(/(^|\s)flex-col(\s|$)/)
    expect(corpo.className.split(/\s+/)).not.toContain('justify-between')
  })
})
