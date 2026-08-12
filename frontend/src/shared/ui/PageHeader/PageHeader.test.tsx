import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { PageHeader } from './PageHeader'
import { DetailHeader } from '../DetailHeader'

/**
 * O título de página é `h1` porque estes dois componentes são os donos únicos
 * do título desde a UI-05 de 2026-08-11 — quando o `h1` saiu do Header,
 * ninguém assumiu o nível 1 e toda rota autenticada passou a abrir a árvore de
 * cabeçalhos no nível 2 (UI-02 do review de 2026-08-12).
 *
 * As asserções são sobre o NÍVEL do cabeçalho, não sobre o texto: o texto já
 * aparecia certo com `h2`, e é por isso que a jornada visual não viu nada.
 */

afterEach(() => {
  cleanup()
})

describe('dono do título de página', () => {
  it('PageHeader renderiza o título como h1, e é o único cabeçalho', () => {
    const { container } = render(<PageHeader title="Personas" description="Instructores" />)

    expect(container.querySelector('h1')?.textContent).toBe('Personas')
    expect(container.querySelectorAll('h2, h3, h4, h5, h6')).toHaveLength(0)
  })

  it('DetailHeader renderiza o título como h1 (página de detalhe tem o mesmo dono)', () => {
    const { container } = render(<DetailHeader title="Presupuesto 12" subtitle="Enel" />)

    expect(container.querySelector('h1')?.textContent).toBe('Presupuesto 12')
    expect(container.querySelectorAll('h2, h3, h4, h5, h6')).toHaveLength(0)
  })
})
