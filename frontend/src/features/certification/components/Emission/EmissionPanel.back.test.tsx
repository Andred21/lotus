import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { api } from '@shared/api/axios'
import { renderWithProviders } from '@shared/testing/providers'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import type { EmissionPanelTurmaData } from '@shared/types/generated'
import { EmissionPanel } from './EmissionPanel'

/** Hook REAL, como em `EmissionPanel.period.test.tsx`: o que se prova é o que a
 * tela faz ao voltar da tabela para os cards, sem estado montado à mão. */
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

function abrir(rotulo: string) {
  fireEvent.click(screen.getByLabelText(rotulo).closest('.p-dropdown') as HTMLElement)
}

function montar(turmas: EmissionPanelTurmaData[] = [TURMA]) {
  get.mockReset()
  get.mockResolvedValue({ data: turmas })
  return renderWithProviders(<EmissionPanel />)
}

describe('EmissionPanel — voltar aos cards', () => {
  it('sem turma escolhida o botão de voltar não existe', async () => {
    montar()
    await screen.findByText('Scap 190 - R1')

    expect(screen.queryByRole('button', { name: 'certificate.backToTurmas' })).toBeNull()
  })

  it('com a turma aberta o botão aparece na linha do "emitir todos"; clicar devolve os cards e mantém o período', async () => {
    montar()
    await screen.findByText('Scap 190 - R1')

    abrir('common.period.label')
    fireEvent.click(screen.getByText('certificate.period.week'))
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    fireEvent.click(await screen.findByRole('button', { name: /Scap 190 - R1/ }))
    expect(await screen.findByText('Ana Torres')).toBeTruthy()

    const voltar = screen.getByRole('button', { name: 'certificate.backToTurmas' })
    const emitir = screen.getByRole('button', { name: /certificate\.emitAllPending/ })
    // Mesma linha: o voltar à esquerda, o grupo do CTA à direita.
    expect(voltar.parentElement).toBe(emitir.parentElement?.parentElement)

    fireEvent.click(voltar)

    expect(await screen.findByRole('button', { name: /Scap 190 - R1/ })).toBeTruthy()
    expect(screen.queryByText('Ana Torres')).toBeNull()
    expect(screen.queryByRole('button', { name: 'certificate.backToTurmas' })).toBeNull()
    // O período segue o da semana: voltar limpa a turma, não a janela.
    expect(screen.getByLabelText('common.period.label').closest('.p-dropdown')?.textContent).toContain(
      'certificate.period.week',
    )
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('o botão de voltar existe também quando a turma aberta não tem pendente', async () => {
    const emitida = {
      ...TURMA,
      enrollments: [{ ...TURMA.enrollments[0], certificate: { id: 1, codigo: 'C-1', status: 'vigente' } }],
    } as unknown as EmissionPanelTurmaData
    montar([emitida])
    await screen.findByText('certificate.noPendingTurmas')

    abrir('certificate.turmaConcluida')
    fireEvent.click(screen.getByText('Scap 190 - R1 · Alta tensión · 12/10/26'))

    expect(await screen.findByRole('button', { name: 'certificate.backToTurmas' })).toBeTruthy()
  })
})
