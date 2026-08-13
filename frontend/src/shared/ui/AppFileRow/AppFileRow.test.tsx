import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppFileRow } from './AppFileRow'

describe('AppFileRow', () => {
  it('expoe o nome inteiro em title, porque a linha trunca', () => {
    // UI-01: a 390px o nome sai truncado sem hover e sem quebra — o valor
    // some da tela sem nenhum caminho para lê-lo.
    render(<AppFileRow name="certificado-de-titulo-profesional-2026.pdf" mime="application/pdf" />)

    expect(screen.getByText('certificado-de-titulo-profesional-2026.pdf').getAttribute('title'))
      .toBe('certificado-de-titulo-profesional-2026.pdf')
  })
})
