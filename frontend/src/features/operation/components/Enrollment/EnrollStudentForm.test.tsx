import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { EnrollStudentForm } from './EnrollStudentForm'
import { useEnrollStudentFlow } from '../../hooks/useEnrollStudentFlow'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('../../hooks/useEnrollStudentFlow', () => ({ useEnrollStudentFlow: vi.fn() }))

type Fluxo = ReturnType<typeof useEnrollStudentFlow>

const fluxo = (sobre: Partial<Fluxo>) =>
  ({
    step: 'rut',
    rut: '11.111.111-1',
    setRut: vi.fn(),
    preview: null,
    isNewStudent: true,
    moveOpen: false,
    turmaClientName: 'Cliente',
    details: { name: '', email: '', phone: '' },
    setField: vi.fn(),
    runPreview: vi.fn(),
    confirmMove: vi.fn(),
    cancelMove: vi.fn(),
    submit: vi.fn(),
    reset: vi.fn(),
    fieldErrors: undefined,
    message: null,
    previewing: false,
    submitting: false,
    ...sobre,
  }) as unknown as Fluxo

const montar = () =>
  renderWithProviders(<EnrollStudentForm turmaId={1} turmaClientName="Cliente" visible onHide={() => {}} />)

const rodape = () => document.querySelector('.p-dialog-footer') as HTMLElement
const corpo = () => document.querySelector('.p-dialog-content') as HTMLElement

/** Bloco 43: os botões moravam no corpo, e o footer navy ficava vazio. */
describe('EnrollStudentForm — botões no footer', () => {
  it('no passo do RUT, cancelar e verificar vivem no footer', () => {
    vi.mocked(useEnrollStudentFlow).mockReturnValue(fluxo({ step: 'rut' }))
    montar()

    expect(within(rodape()).getByRole('button', { name: 'operation.enrollment.form.cancel' })).toBeTruthy()
    expect(within(rodape()).getByRole('button', { name: 'operation.enrollment.form.verify' })).toBeTruthy()
    expect(within(corpo()).queryAllByRole('button')).toHaveLength(0)
  })

  it('no passo dos dados, o footer matricula e o RUT segue travado', () => {
    vi.mocked(useEnrollStudentFlow).mockReturnValue(
      fluxo({ step: 'details', details: { name: 'Ana', email: '', phone: '' } }),
    )
    montar()

    expect(within(rodape()).getByRole('button', { name: 'operation.enrollment.form.submit' })).toBeTruthy()
    expect(within(rodape()).queryByRole('button', { name: 'operation.enrollment.form.verify' })).toBeNull()
    expect((screen.getByDisplayValue('11.111.111-1') as HTMLInputElement).disabled).toBe(true)
  })
})
