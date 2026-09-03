import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CertificateFolio } from './CertificateFolio'
import { fieldLabelClass } from '../typography'

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

  /** Rótulo de campo sem o par `dt`/`dd` é duas caixas soltas: a legenda deixa
   * de NOMEAR o código para o leitor de tela. O par existia enquanto o folio
   * era mais um item do `<dl>` da validação e se perdeu quando ele virou a
   * assinatura da página (Q-4 do review de 2026-08-29) — por isso a peça
   * carrega a própria lista de definição, e por isso isto é catraca. */
  it('legenda e folio saem como par `dt`/`dd` da MESMA lista de definição', () => {
    const { container } = render(
      <CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="page" />,
    )

    const lista = container.querySelector('dl')
    expect(lista).not.toBeNull()
    expect(screen.getByText('FOLIO').tagName).toBe('DT')
    expect(screen.getByText('CERT-2026-000123').tagName).toBe('DD')
    expect(lista?.querySelectorAll(':scope > dt, :scope > dd')).toHaveLength(2)
  })
})
