import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StatValue } from './StatValue'

afterEach(cleanup)

/**
 * O número de estatística saía em três tratamentos (achado A3): o KPI já era o
 * alvo (`font-display text-3xl … tabular-nums`), o cartão de presupuesto exibia
 * UF **sem** `tabular-nums` — dígito dançando na coluna a cada re-render — e o
 * cartão de perfil pagava `text-2xl font-semibold` sem família de display.
 */
describe('StatValue', () => {
  it('o número da página é o degrau grande, em display e tabular', () => {
    render(<StatValue size="page">42</StatValue>)

    const numero = screen.getByText('42')
    expect(numero.className).toContain('text-3xl')
    expect(numero.className).toContain('font-display')
    expect(numero.className).toContain('tabular-nums')
  })

  it('o número dentro de cartão desce um degrau e continua tabular', () => {
    render(<StatValue size="card">3</StatValue>)

    const numero = screen.getByText('3')
    expect(numero.className).toContain('text-2xl')
    expect(numero.className).toContain('tabular-nums')
  })
})
