import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'
import { PendingTurmaCards } from './PendingTurmaCards'

/** `t` devolve a chave com as opções interpoladas: o que se prova é QUAL texto
 * o card escolhe e com QUAIS números, não a tradução (isso é do parity.test). */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    }),
  }
})

function aluno(id: number, over: Partial<EmissionPanelEnrollmentData> = {}): EmissionPanelEnrollmentData {
  return {
    enrollment_id: id, student_name: `Aluno ${id}`, student_rut: '11.111.111-1', approval_status: 'aprobado',
    attendance_pct: '90', nota_final: '6.5', certificate: null, student_photo_url: null, ...over,
  }
}

const EMITIDO = { id: 1, codigo: 'C-1', status: 'vigente' } as unknown as EmissionPanelEnrollmentData['certificate']

function turma(id: number, over: Partial<EmissionPanelTurmaData> = {}): EmissionPanelTurmaData {
  return {
    turma_id: id, quote_code: `Scap ${id} - R1`, course_name: 'Alta tensión', client_name: 'Enel',
    end_date: '2026-10-12', emission_blocked: null, enrollments: [aluno(id * 100)],
    manager_signature_missing: false, redatores: [], ...over,
  }
}

describe('PendingTurmaCards', () => {
  it('lista só as turmas com aluno por emitir', () => {
    render(
      <PendingTurmaCards
        onSelect={() => {}}
        turmas={[
          turma(1),
          turma(2, { enrollments: [aluno(200, { certificate: EMITIDO })] }),
          turma(3, { enrollments: [aluno(300, { approval_status: 'reprobado' })] }),
        ]}
      />,
    )

    expect(screen.getByText('Scap 1 - R1')).toBeTruthy()
    expect(screen.queryByText('Scap 2 - R1')).toBeNull()
    expect(screen.queryByText('Scap 3 - R1')).toBeNull()
  })

  it('mostra cotação, curso, cliente e a contagem "N por emitir · M emitidos"', () => {
    const enrollments = [
      ...Array.from({ length: 3 }, (_, i) => aluno(i + 1)),
      aluno(10, { certificate: EMITIDO }),
      aluno(11, { certificate: EMITIDO }),
    ]
    render(<PendingTurmaCards onSelect={() => {}} turmas={[turma(1, { enrollments })]} />)

    expect(screen.getByText('Scap 1 - R1')).toBeTruthy()
    expect(screen.getByText(/Alta tensión/)).toBeTruthy()
    expect(screen.getByText(/Enel/)).toBeTruthy()
    // Os dois números são dado em pedaços próprios: o "por emitir" ganha tinta
    // semântica e o "emitidos" fica secundário, o que uma frase só não permite.
    expect(screen.getByText('certificate.cardToIssue {"count":3}')).toBeTruthy()
    expect(screen.getByText('certificate.cardIssued {"count":2}')).toBeTruthy()
  })

  it('turma bloqueada entra com a tag do motivo', () => {
    render(<PendingTurmaCards onSelect={() => {}} turmas={[turma(1, { emission_blocked: 'sin_redactor' })]} />)

    expect(screen.getByText('certificate.blocked.sin_redactor')).toBeTruthy()
  })

  it('clicar no card chama onSelect com o turma_id', () => {
    const onSelect = vi.fn()
    render(<PendingTurmaCards onSelect={onSelect} turmas={[turma(7), turma(8)]} />)

    fireEvent.click(screen.getByRole('button', { name: /Scap 8 - R1/ }))

    expect(onSelect).toHaveBeenCalledWith(8)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('sem nenhuma pendente, mostra o vazio com a dica de ampliar o período', () => {
    render(
      <PendingTurmaCards
        onSelect={() => {}}
        turmas={[turma(2, { enrollments: [aluno(200, { certificate: EMITIDO })] })]}
      />,
    )

    expect(screen.getByText('certificate.noPendingTurmas')).toBeTruthy()
    expect(screen.getByText('certificate.noPendingTurmasHint')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
