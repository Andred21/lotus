import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StudentTurmaData } from '@shared/types/generated'
import { StudentCertificateCell } from './StudentCertificateCell'

/** Irmão de `StudentCertificateCell.test.tsx`: lá se prova o que a célula
 * ESCOLHE mostrar (os quatro ramos, data, reemissão); aqui, o botão do PDF e o
 * que ele diz quando falha. Separados porque a régua de 150 linhas de
 * `components/**` vale para o teste também. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const open = vi.fn()
const OPENER_LIMPO = { open, pending: false, popupBlocked: false, message: null as string | null }
/** Mutável de propósito: o aviso é ramo do RETORNO do abridor, e mocká-lo é a
 * única forma de exercitá-lo sem subir a mutation de verdade — o caminho do
 * blob é assunto do `useBlobTabOpener.test.tsx`. */
let opener = { ...OPENER_LIMPO }
vi.mock('../../hooks/useStudentCertificatePdfOpener', () => ({
  useStudentCertificatePdfOpener: () => opener,
}))

function turma(): StudentTurmaData {
  return {
    turma_id: 99,
    quote_code: 'Scap 9-1',
    course_name: 'Alta Tensión',
    start_date: '2026-07-20',
    approval_status: 'aprobado',
    certificate: { id: 42, codigo: 'LOT-2026-0001', display_status: 'vigente', valido_ate: null, snapshot_ok: true },
    superseded_count: 0,
  }
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StudentCertificateCell turma={turma()} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  open.mockClear()
  opener = { ...OPENER_LIMPO }
})

describe('StudentCertificateCell — o PDF', () => {
  /** Abre o certificado DAQUELA linha, não a turma: os dois ids divergem na
   * fixture de propósito (`turma_id: 99`, `certificate.id: 42`). */
  it('clicar no botão abre o certificado pelo próprio id', () => {
    montar()

    fireEvent.click(screen.getByLabelText('certificate.downloadPdf'))

    expect(open).toHaveBeenCalledWith(42)
  })

  /** Popup bloqueado tem texto PRÓPRIO: o remédio é do usuário (liberar o
   * pop-up), não do suporte. Sem ele o botão só pararia de carregar, mudo. */
  it('popup bloqueado mostra o texto próprio, não a mensagem do erro', () => {
    opener = { ...OPENER_LIMPO, popupBlocked: true, message: 'não deveria aparecer' }

    montar()

    expect(screen.getByText('certificate.popupBlocked')).toBeTruthy()
    expect(screen.queryByText('não deveria aparecer')).toBeNull()
  })

  it('erro da requisição aparece na linha do certificado', () => {
    opener = { ...OPENER_LIMPO, message: 'No tienes permiso para ver el certificado.' }

    montar()

    expect(screen.getByText('No tienes permiso para ver el certificado.')).toBeTruthy()
  })

  it('sem falha nenhuma, a célula não imprime aviso', () => {
    montar()

    expect(screen.queryByText('certificate.popupBlocked')).toBeNull()
  })
})
