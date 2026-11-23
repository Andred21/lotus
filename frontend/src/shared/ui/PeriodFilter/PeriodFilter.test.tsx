import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import { PeriodFilter } from './PeriodFilter'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// O `AppDatePicker` resolve `locale="es"` por `localeOption`, que só existe depois de `addLocale`.
beforeAll(registerPrimeLocales)

type Key = 'all' | 'week' | 'custom'

const PRESETS: { value: Key; label: string }[] = [
  { value: 'all', label: 'Todo el tiempo' },
  { value: 'week', label: 'Esta semana' },
  { value: 'custom', label: 'Personalizado' },
]

const PERIODO = { start: '2026-11-01', end: '2026-11-22' }

function renderizar(over: Partial<Parameters<typeof PeriodFilter<Key>>[0]> = {}) {
  return render(
    <PeriodFilter<Key>
      preset="all"
      presets={PRESETS}
      customKey="custom"
      period={PERIODO}
      onPresetChange={() => {}}
      onPeriodChange={() => {}}
      {...over}
    />,
  )
}

describe('PeriodFilter', () => {
  it('as opções vêm da prop presets', () => {
    const { container } = renderizar()
    fireEvent.click(container.querySelector('.p-dropdown') as HTMLElement)
    expect(screen.getByText('Esta semana')).toBeTruthy()
    expect(screen.getByText('Personalizado')).toBeTruthy()
  })

  it('as datas só aparecem com o preset customKey', () => {
    const { rerender } = renderizar({ preset: 'week' })
    expect(screen.queryByLabelText('common.period.start')).toBeNull()

    rerender(
      <PeriodFilter<Key>
        preset="custom"
        presets={PRESETS}
        customKey="custom"
        period={PERIODO}
        onPresetChange={() => {}}
        onPeriodChange={() => {}}
      />,
    )
    expect(screen.getByLabelText('common.period.start')).toBeTruthy()
    expect(screen.getByLabelText('common.period.end')).toBeTruthy()
  })

  it('o InlineLoadState só aparece com staleError', () => {
    const onRetry = vi.fn()
    const { rerender } = renderizar({ onRetry })
    expect(screen.queryByRole('alert')).toBeNull()

    rerender(
      <PeriodFilter<Key>
        preset="all"
        presets={PRESETS}
        customKey="custom"
        period={PERIODO}
        onPresetChange={() => {}}
        onPeriodChange={() => {}}
        staleError="Falla de red"
        onRetry={onRetry}
      />,
    )
    expect(screen.getByRole('alert').textContent).toContain('Falla de red')
  })
})
