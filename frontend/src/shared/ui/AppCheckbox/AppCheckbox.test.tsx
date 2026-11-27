import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AppCheckbox } from './AppCheckbox'

describe('AppCheckbox', () => {
  it('usa ícone Phosphor no check', () => {
    const { container } = render(<AppCheckbox checked onChange={() => {}} />)

    const svg = container.querySelector('.p-checkbox-box svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('p-icon')).toBe(false)
  })

  it('desmarcado não desenha ícone', () => {
    const { container } = render(<AppCheckbox checked={false} onChange={() => {}} />)

    expect(container.querySelector('.p-checkbox-box svg')).toBeNull()
  })
})
