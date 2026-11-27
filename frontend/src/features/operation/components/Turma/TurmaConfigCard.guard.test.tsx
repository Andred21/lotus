import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import type { TurmaData } from '@shared/types/generated'
import type { useTurmaConfigForm } from '../../hooks/useTurmaConfigForm'
import { TurmaConfigCard } from './TurmaConfigCard'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type ConfigForm = ReturnType<typeof useTurmaConfigForm>

const form = vi.hoisted<{ current: Partial<ConfigForm> }>(() => ({ current: {} }))
vi.mock('../../hooks/useTurmaConfigForm', () => ({
  useTurmaConfigForm: () => form.current as ConfigForm,
}))

/** A guarda é do hook (aqui mockado): este stub deixa o cartão montar o aviso e
 * registra O QUE passa por ela. QUANDO ela pergunta é do `useUnsavedChangesGuard`
 * (e a prova de ponta a ponta é o `TurmaCreatePage.guard.test.tsx`). */
const guard = {
  confirmDiscard: vi.fn((proceed: () => void) => proceed()),
  allowNavigation: vi.fn(),
  revoke: vi.fn(),
  dialogProps: { visible: false, onConfirm: () => {}, onCancel: () => {}, blocker: null },
}

const TURMA = {
  id: 1, course_id: 9, modalidade: 'presencial', local_aplicacao: 'Santiago',
  start_date: '2026-01-05', end_date: '2026-02-05', status: 'em_andamento',
} as TurmaData

const cancelar = () => fireEvent.click(screen.getByRole('button', { name: /operation\.config\.cancel/ }))

// O `AppDatePicker` resolve o locale do Prime registrado no boot (`main.tsx`).
beforeAll(registerPrimeLocales)
beforeEach(() => {
  guard.confirmDiscard.mockClear()
  guard.allowNavigation.mockClear()
  guard.revoke.mockClear()
  form.current = {
    form: { modalidade: 'presencial', local_aplicacao: '', start_date: '', end_date: '' },
    set: () => {}, readOnly: false, submit: () => {}, pending: false,
    fieldErrors: undefined, generalError: undefined, workloadHours: null,
    dirty: false, guard,
  }
})

/**
 * Cancelar descarta o rascunho: passa pela guarda, e só o que ela liberar chega
 * ao `onCancel`. O Descartar já respondeu o aviso, então a liberação da próxima
 * navegação vai junto (na criação o `onCancel` é o "volver", que navega).
 */
describe('TurmaConfigCard — Cancelar passa pela guarda', () => {
  it('com rascunho, pede confirmação à guarda e, liberado, chama onCancel com a navegação liberada', () => {
    form.current = { ...form.current, dirty: true }
    const onCancel = vi.fn()
    render(<TurmaConfigCard mode="create" quoteId={7} onSaved={() => {}} onCancel={onCancel} />)

    cancelar()

    expect(guard.confirmDiscard).toHaveBeenCalledTimes(1)
    expect(guard.allowNavigation).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('sem rascunho, cancela sem deixar liberação pendurada para o próximo rascunho', () => {
    const onCancel = vi.fn()
    render(<TurmaConfigCard mode="edit" turma={TURMA} onSaved={() => {}} onCancel={onCancel} />)

    cancelar()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(guard.allowNavigation).not.toHaveBeenCalled()
  })

  it('guarda que segura (rascunho sujo, aviso aberto) não chama onCancel', () => {
    form.current = { ...form.current, dirty: true }
    guard.confirmDiscard.mockImplementationOnce(() => {})
    const onCancel = vi.fn()
    render(<TurmaConfigCard mode="create" quoteId={7} onSaved={() => {}} onCancel={onCancel} />)

    cancelar()

    expect(onCancel).not.toHaveBeenCalled()
    expect(guard.allowNavigation).not.toHaveBeenCalled()
  })

  it('onCancel que lança revoga a liberação que acabou de conceder', () => {
    form.current = { ...form.current, dirty: true }
    const onCancel = vi.fn(() => { throw new Error('onCancel reprovou') })
    render(<TurmaConfigCard mode="create" quoteId={7} onSaved={() => {}} onCancel={onCancel} />)

    // O erro sobe pelo handler do React; o que se prova é a guarda ter sido desarmada.
    try { cancelar() } catch { /* esperado */ }

    expect(guard.revoke).toHaveBeenCalledTimes(1)
  })
})
