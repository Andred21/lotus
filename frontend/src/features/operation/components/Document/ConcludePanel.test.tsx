import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { TurmaData } from '@shared/types/generated'
import { ConcludePanel } from './ConcludePanel'
import type { useConclusionSection } from '../../hooks/useConclusionSection'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts ? `${key}|${JSON.stringify(opts)}` : key),
    }),
  }
})

type Section = ReturnType<typeof useConclusionSection>
let section: Section

vi.mock('../../hooks/useConclusionSection', () => ({ useConclusionSection: () => section }))

const base = (over: Partial<Section> = {}): Section => ({
  displayStatus: 'em_andamento',
  habilitada: true,
  concluida: false,
  missingTypes: [],
  missingRequirements: [],
  incompleteStudents: [],
  canComplete: true,
  concludedAt: null,
  conclude: vi.fn(),
  concluding: false,
  error: '',
  resetConclude: vi.fn(),
  ...over,
})

const renderPanel = () => render(<ConcludePanel turma={{ id: 1 } as TurmaData} />)

describe('ConcludePanel', () => {
  beforeEach(() => { section = base() })

  it('desabilitada por requisito, lista o requisito no card de pendências', () => {
    section = base({ habilitada: false, missingRequirements: ['redator'] })
    renderPanel()

    expect(screen.getByText('operation.conclusion.missingTitle')).toBeTruthy()
    expect(screen.getByText('operation.conclusion.requirement.redator')).toBeTruthy()
    expect((screen.getByRole('button', { name: /operation.conclusion.confirm/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('habilitada com incompletos, a confirmação mostra a lista e o confirmar segue habilitado', () => {
    section = base({ incompleteStudents: [{ name: 'Bruno', missing: ['grade'] }] })
    renderPanel()

    expect(screen.queryByText(/operation\.conclusion\.incomplete\.title/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /operation.conclusion.confirm/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('operation.conclusion.incomplete.title|{"count":1}')).toBeTruthy()
    expect((within(dialog).getByRole('button', { name: /operation.conclusion.confirm/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('sem incompletos, a confirmação não mostra a lista', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /operation.conclusion.confirm/ }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByText(/operation\.conclusion\.incomplete\.title/)).toBeNull()
  })
})
