import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StudentTurmaData } from '@shared/types/generated'
import { StudentCertificateCell } from './StudentCertificateCell'

/** `t` devolve a chave: o que se prova é QUAL texto a célula escolhe, não a
 * tradução (isso é do `parity.test.ts`). */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

/** Mock por MÓDULO do hook: aqui se prova o que a célula ESCOLHE mostrar. O
 * botão do PDF e os avisos dele são o assunto do arquivo irmão
 * `StudentCertificateCellPdf.test.tsx` — separados porque a régua de 150
 * linhas de `components/**` vale para o teste também. */
vi.mock('../../hooks/useStudentCertificatePdfOpener', () => ({
  useStudentCertificatePdfOpener: () => ({ open: vi.fn(), pending: false, popupBlocked: false, message: null }),
}))

/** Casa data em qualquer locale (`es-CL`: `31-01-2027`; `en`: `1/31/2027`), ao contrário da regex morta que só casava `\d{2}/\d{2}/\d{4}`. */
const DATE_PATTERN = /\d{1,2}[-/]\d{1,2}[-/]\d{4}/

function turma(over: Partial<StudentTurmaData> = {}): StudentTurmaData {
  return {
    turma_id: 1,
    quote_code: 'Scap 9-1',
    course_name: 'Alta Tensión',
    start_date: '2026-07-20',
    approval_status: 'aprobado',
    certificate: null,
    superseded_count: 0,
    ...over,
  }
}

function certificado(over: Partial<NonNullable<StudentTurmaData['certificate']>> = {}) {
  return {
    id: 10,
    codigo: 'LOT-2026-0001',
    display_status: 'vigente' as const,
    valido_ate: null,
    snapshot_ok: true,
    ...over,
  }
}

const montar = (t: StudentTurmaData) => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StudentCertificateCell turma={t} />
    </QueryClientProvider>,
  )
}

describe('StudentCertificateCell', () => {
  /** Ramo 1, o caso comum: vigência indeterminada mostra o rótulo SEM data. */
  it('certificado sem prazo mostra código e estado, e nenhuma data', () => {
    const { container } = montar(turma({ certificate: certificado() }))

    expect(screen.getByText('LOT-2026-0001')).toBeTruthy()
    expect(screen.getByText('certificate.status.vigente')).toBeTruthy()
    expect(container.textContent).not.toMatch(DATE_PATTERN)
  })

  /** O rótulo é o MESMO com e sem prazo (spec D6); a data ao lado é o que
   * distingue os dois. */
  it('certificado com prazo mostra a data ao lado do estado', () => {
    montar(turma({ certificate: certificado({ valido_ate: '2027-01-31', display_status: 'por_vencer' }) }))

    expect(screen.getByText('certificate.status.por_vencer')).toBeTruthy()
    expect(screen.getByText(/2027/)).toBeTruthy()
  })

  it('certificado revogado aparece, não some', () => {
    montar(turma({ certificate: certificado({ display_status: 'revocado' }) }))

    expect(screen.getByText('certificate.status.revocado')).toBeTruthy()
  })

  it('certificado vencido aparece com o estado do servidor', () => {
    montar(turma({ certificate: certificado({ display_status: 'vencido', valido_ate: '2020-01-01' }) }))

    expect(screen.getByText('certificate.status.vencido')).toBeTruthy()
  })

  /** Ramo 4: documento corrompido não tem estado a afirmar — a tag de defeito
   * ocupa o lugar da de estado. Política herdada do Historial, não inventada. */
  it('snapshot corrompido troca a tag de estado pela de defeito', () => {
    montar(turma({ certificate: certificado({ snapshot_ok: false }) }))

    expect(screen.getByText('certificate.snapshotCorrupted')).toBeTruthy()
    expect(screen.queryByText('certificate.status.vigente')).toBeNull()
  })

  /** Rastro de reemissão: o atual mais a contagem dos anteriores (spec D8). */
  it('reemissão mostra a contagem dos anteriores', () => {
    montar(turma({ certificate: certificado(), superseded_count: 2 }))

    expect(screen.getByText('student.certificateSuperseded')).toBeTruthy()
  })

  it('sem reemissão não mostra contagem', () => {
    montar(turma({ certificate: certificado(), superseded_count: 0 }))

    expect(screen.queryByText('student.certificateSuperseded')).toBeNull()
  })

  /** Ramos 2 e 3: as duas ausências têm significados OPOSTOS e não podem
   * parecer iguais. */
  it('matrícula aprovada sem certificado fica pendente de emissão', () => {
    montar(turma({ approval_status: 'aprobado', certificate: null }))

    expect(screen.getByText('student.certificatePending')).toBeTruthy()
  })

  it('matrícula reprovada não corresponde', () => {
    montar(turma({ approval_status: 'reprobado', certificate: null }))

    expect(screen.getByText(/student.certificateNotApplicable/)).toBeTruthy()
  })

  it('matrícula pendente não corresponde', () => {
    montar(turma({ approval_status: 'pendiente', certificate: null }))

    expect(screen.getByText(/student.certificateNotApplicable/)).toBeTruthy()
  })

})
