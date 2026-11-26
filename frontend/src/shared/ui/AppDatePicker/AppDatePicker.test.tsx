import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import { AppDatePicker } from './AppDatePicker'

beforeAll(async () => {
  registerPrimeLocales()
  await i18n.changeLanguage('es-CL')
})

const phosphor = (el: Element | null) => {
  const svg = el?.querySelector('svg')
  expect(svg).not.toBeNull()
  expect(svg?.classList.contains('p-icon')).toBe(false)
}

describe('AppDatePicker — ícones internos', () => {
  it('usa ícone Phosphor no botão do calendário', () => {
    const { container } = render(<AppDatePicker value="2026-08-19" onChange={() => {}} />)

    phosphor(container.querySelector('.p-datepicker-trigger'))
  })

  it('usa ícone Phosphor nas setas de mês do painel', () => {
    const { container } = render(<AppDatePicker value="2026-08-19" onChange={() => {}} />)

    fireEvent.click(container.querySelector('.p-datepicker-trigger') as HTMLElement)
    phosphor(document.querySelector('.p-datepicker-prev'))
    phosphor(document.querySelector('.p-datepicker-next'))
  })
})
