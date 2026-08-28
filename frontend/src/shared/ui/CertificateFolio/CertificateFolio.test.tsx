import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CertificateFolio } from './CertificateFolio'
import { fieldLabelClass } from '../typography'

afterEach(cleanup)

/**
 * A assinatura que o ADR-16 elegeu — o folio tratado como artefato — nunca foi
 * executada: na página pública de validação ele saía em `text-sm font-medium`,
 * a MESMA grafia do nome do aluno, e sem mono (achados D4 e A4).
 */
describe('CertificateFolio', () => {
  it('o folio é mono e tabular — é dado técnico, não prosa', () => {
    render(<CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="page" />)

    const folio = screen.getByText('CERT-2026-000123')
    expect(folio.className).toContain('font-mono')
    expect(folio.className).toContain('tabular-nums')
  })

  it('na página o folio é o degrau grande, com tracking de artefato', () => {
    render(<CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="page" />)

    const folio = screen.getByText('CERT-2026-000123')
    expect(folio.className).toContain('text-3xl')
    expect(folio.className).toContain('tracking-[0.15em]')
  })

  it('no diálogo desce um degrau em tamanho e em tracking', () => {
    render(<CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="dialog" />)

    const folio = screen.getByText('CERT-2026-000123')
    expect(folio.className).toContain('text-xl')
    expect(folio.className).toContain('tracking-[0.1em]')
  })

  /** A legenda é rótulo de CAMPO, não heading: o bloco não encabeça grupo
   * nenhum, e promovê-lo inventaria hierarquia numa página pública de peso
   * legal (spec D5). */
  it('a legenda usa a grafia de rótulo de campo e não é heading', () => {
    const { container } = render(
      <CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="page" />,
    )

    expect(screen.getByText('FOLIO').className).toContain(fieldLabelClass)
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
  })
})
