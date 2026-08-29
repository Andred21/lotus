import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FormSection } from './FormSection'
import { sectionLabelClass } from '../typography'

afterEach(cleanup)

/**
 * A P-36 já foi reaberta três vezes, sempre pela mesma via: o título de seção
 * volta a receber a tinta de marca porque "sem cor fica sem graça". A decisão
 * (spec D1) é que a marca preenchida passa a valer só para a ação primária do
 * cartão, e que a hierarquia do título vem de PESO e TRACKING. Isto é o
 * mecanismo dessa decisão — sem ele, ela é só um parágrafo de docblock.
 */
describe('FormSection', () => {
  it('pinta o título com a tinta de CORPO, não com a de marca', () => {
    render(<FormSection title="Identidad" />)

    const titulo = screen.getByRole('heading', { name: 'Identidad' })
    expect(titulo.getAttribute('style')).toContain('var(--text-color)')
  })

  it('carrega a hierarquia no peso e no tracking, não na cor', () => {
    render(<FormSection title="Identidad" />)

    const titulo = screen.getByRole('heading', { name: 'Identidad', level: 3 })
    expect(titulo.className).toContain(sectionLabelClass)
  })

  it('`spaced` acrescenta o respiro de cima sem mexer no resto', () => {
    const { container } = render(<FormSection title="Seguridad" spaced />)

    expect(container.firstElementChild?.className).toContain('pt-2')
  })
})
