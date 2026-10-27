import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { IncompleteResultsList } from './IncompleteResultsList'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts ? `${key}|${JSON.stringify(opts)}` : key),
    }),
  }
})

describe('IncompleteResultsList', () => {
  const students = [
    { name: 'Bruno', missing: ['grade'] as Array<'grade' | 'attendance'> },
    { name: 'Carla', missing: ['grade', 'attendance'] as Array<'grade' | 'attendance'> },
  ]

  it('mostra o título, um item por aluno e a dica, numa lista com role="list"', () => {
    render(<IncompleteResultsList students={students} />)

    expect(screen.getByText('operation.conclusion.incomplete.title|{"count":2}')).toBeTruthy()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('"name":"Bruno"')
    expect(items[0].textContent).toContain('operation.conclusion.incomplete.grade')
    expect(items[1].textContent).toContain('operation.conclusion.incomplete.both')
    expect(screen.getByText('operation.conclusion.incomplete.hint')).toBeTruthy()
  })

  it('só a presença faltando usa o texto de presença', () => {
    render(<IncompleteResultsList students={[{ name: 'Dani', missing: ['attendance'] }]} />)

    expect(screen.getByRole('listitem').textContent).toContain('operation.conclusion.incomplete.attendance')
  })
})
