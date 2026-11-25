import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { api } from '@shared/api/axios'
import { currentCalendarPeriod } from '@shared/lib'
import { renderWithProviders } from '@shared/testing/providers'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import type { EmissionPanelTurmaData } from '@shared/types/generated'
import { EmissionPanel } from './EmissionPanel'

/** Aqui o hook é o REAL: o que se prova é o pedido que sai para o servidor e o
 * que a tela faz com a resposta. O estado montado à mão mora em
 * `EmissionPanel.test.tsx` (a régua de 150 linhas obriga o par). `t` devolve a
 * chave: a tradução é do `parity.test.ts`. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

const get = vi.mocked(api.get)

// O `AppDatePicker` do `PeriodFilter` resolve o locale do Prime no boot.
beforeAll(registerPrimeLocales)

const TURMA: EmissionPanelTurmaData = {
  turma_id: 5, quote_code: 'Scap 190 - R1', course_name: 'Alta tensión', client_name: 'Enel', end_date: '2026-10-12',
  emission_blocked: null, manager_signature_missing: false, redatores: [],
  enrollments: [
    {
      enrollment_id: 10, student_name: 'Ana Torres', student_rut: '11.111.111-1', approval_status: 'aprobado',
      attendance_pct: '90', nota_final: '6.5', certificate: null, student_photo_url: null,
    },
  ],
}

/** Abre o dropdown cujo rótulo acessível é `rotulo`. */
function abrir(rotulo: string) {
  fireEvent.click(screen.getByLabelText(rotulo).closest('.p-dropdown') as HTMLElement)
}

function montar(turmas: EmissionPanelTurmaData[] = [TURMA]) {
  get.mockReset()
  get.mockResolvedValue({ data: turmas })
  return renderWithProviders(<EmissionPanel />)
}

describe('EmissionPanel — o período (D7)', () => {
  it('o preset padrão, Últimos 12 meses, não manda parâmetro de período', async () => {
    montar()

    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(get).toHaveBeenCalledWith('/api/certificates/emission-panel', { params: {} })
  })

  it('Mes manda o mês corrente, do dia 1 até hoje', async () => {
    montar()
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    abrir('common.period.label')
    fireEvent.click(screen.getByText('certificate.period.month'))

    const mes = currentCalendarPeriod('month', new Date())
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/api/certificates/emission-panel', {
        params: { period_start: mes.start, period_end: mes.end },
      }),
    )
  })

  it('Personalizado revela as duas datas', async () => {
    montar()
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByLabelText('common.period.start')).toBeNull()

    abrir('common.period.label')
    fireEvent.click(screen.getByText('certificate.period.custom'))

    expect(screen.getByLabelText('common.period.start')).toBeTruthy()
    expect(screen.getByLabelText('common.period.end')).toBeTruthy()
  })

  it('trocar o período com o GET novo em voo mantém os cards do piso na tela', async () => {
    montar()
    await screen.findByText('Scap 190 - R1')

    get.mockReturnValue(new Promise(() => {}))
    abrir('common.period.label')
    fireEvent.click(screen.getByText('certificate.period.week'))

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Scap 190 - R1')).toBeTruthy()
  })

  it('o 422 de period_end aparece junto do filtro e a tela mantém o dado anterior', async () => {
    montar()
    await screen.findByText('Scap 190 - R1')

    get.mockRejectedValue({ status: 422, title: 'x', detail: 'x', type: 'x', instance: 'x', errors: { period_end: ['x'] } })
    abrir('common.period.label')
    fireEvent.click(screen.getByText('certificate.period.week'))

    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('common.invalidDataHint')
    // A recusa não derruba a tela: o card da janela anterior segue ali.
    expect(screen.getByText('Scap 190 - R1')).toBeTruthy()
    expect(screen.queryByText('common.loadError')).toBeNull()
  })
})

describe('EmissionPanel — o combo da cotação e os cards', () => {
  it('a opção do combo é "Scap 190 - R1 · curso · dd/mm/yy"', async () => {
    montar()
    await screen.findByText('Scap 190 - R1')

    abrir('certificate.turmaConcluida')

    expect(screen.getByText('Scap 190 - R1 · Alta tensión · 12/10/26')).toBeTruthy()
  })

  it('clicar no card abre a tabela da turma, como o combo', async () => {
    montar()

    fireEvent.click(await screen.findByRole('button', { name: /Scap 190 - R1/ }))

    expect(await screen.findByText('Ana Torres')).toBeTruthy()
    // Com a turma aberta, os cards saem do lugar do vazio.
    expect(screen.queryByText('certificate.noPendingTurmas')).toBeNull()
  })

  it('sem turma com pendência, mostra o vazio com a dica de ampliar o período', async () => {
    montar([])

    expect(await screen.findByText('certificate.noPendingTurmas')).toBeTruthy()
    expect(screen.getByText('certificate.noPendingTurmasHint')).toBeTruthy()
  })
})
